"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDDA = runDDA;
// =============================
// DDA: Dynamic Depreciation Adjustment — 문서식(트리거 포함)
// =============================
const shared_1 = require("./shared");
// 디버그 로그(조용 모드 허용)
const DBG = (...a) => { try { /* console.debug('[DDA]', ...a); */ }
catch { } };
// ---------- 내부 유틸 ----------
const R = (x, step) => {
    const v = Number.isFinite(x) ? x : 0;
    return (0, shared_1.roundTo)(v, step ?? 1e-6);
};
function pickNum(input, keys, d = 0) {
    for (const k of keys) {
        const v = input?.[k];
        const n = (0, shared_1.toNumberLoose)(v, NaN);
        if (Number.isFinite(n))
            return n;
    }
    return d;
}
// ---------- 본체 ----------
function runDDA(input) {
    const roundStep = (0, shared_1.toNumberLoose)(input.options?.roundStep, 1e-6);
    const clampToBounds = (input.options?.clampToBounds ?? true);
    const debug = !!input.options?.debug;
    // 0) 기본 파라미터 정규화
    const cost = (0, shared_1.toNumberLoose)(input.acquisitionCost ?? input.assetCost ?? input.cost, 0);
    const salvage = (0, shared_1.clamp)((0, shared_1.toNumberLoose)(input.residualValue ?? input.salvageValue ?? input.salvage, 0), 0, cost);
    const lifeYears = Math.max(1, (0, shared_1.toNumberLoose)(input.usefulLifeYears ?? input.lifeYears, 1));
    const lifeDays = Math.max(1, Math.round(lifeYears * 365));
    const elapsed = (0, shared_1.clamp)((0, shared_1.toNumberLoose)(input.elapsedUseDays ?? input.elapsedDays, 0), 0, lifeDays);
    const period = (0, shared_1.clamp)((0, shared_1.toNumberLoose)(input.periodUseDays ?? input.currentPeriodUseDays, 0), 0, lifeDays - elapsed);
    const betaIn = (0, shared_1.toFrac)(input.beta ?? 0); // 0~1 권장
    const betaExp = (0, shared_1.toNumberLoose)(input.options?.betaExponent, 1);
    // 1) 일일 감가상각(기준)
    const depreciable = Math.max(0, cost - salvage);
    const dailyBase = (0, shared_1.div)(depreciable, lifeDays, 0);
    // 2) 사용변화율(문서식) ─ (총사용시간−기준사용시간)/기준사용시간
    let usagePct = 0;
    if (Number.isFinite((0, shared_1.toNumberLoose)(input.baselineUseHours, NaN)) &&
        Number.isFinite((0, shared_1.toNumberLoose)(input.totalUseHours, NaN))) {
        const baseUse = Math.max(1e-12, (0, shared_1.toNumberLoose)(input.baselineUseHours, 0));
        const totalUse = Math.max(0, (0, shared_1.toNumberLoose)(input.totalUseHours, 0));
        usagePct = (totalUse - baseUse) / baseUse;
    }
    else if (input.usageChangeR !== undefined || input.usageChangePct !== undefined) {
        usagePct = (0, shared_1.toFrac)(input.usageChangeR ?? input.usageChangePct ?? 0); // 레거시 경로
    }
    else {
        usagePct = 0;
    }
    // 3) 시장 기대단가 기반 r 산출(문서 Step3~4)
    let r = 0;
    const psPrev = pickNum(input, ['psPrev', 'PsPrev', 'prevPs'], NaN);
    const psCurr = pickNum(input, ['psCurr', 'PsCurr', 'currPs'], NaN);
    if (Number.isFinite(psPrev) && Number.isFinite(psCurr)) {
        const a = Math.max(1e-12, psPrev);
        const b = Math.max(1e-12, psCurr);
        r = Math.log(b / a);
    }
    else {
        r = (0, shared_1.toNumberLoose)(input.marketChangeR, 0); // 폴백(레거시)
    }
    // 4) 문서식 민감도 s
    //  - doc 모드: s = exp( r * n(n+1)/2 ) * (beta^u)
    //  - legacy 모드: 기존 exp(beta * r * (1 + (n-1)/n))
    const mode = (input.options?.sensitivityMode ?? 'doc');
    let s = 1;
    if (mode === 'doc') {
        const n = lifeYears; // 문서의 n(연 단위)
        const tri = (n * (n + 1)) / 2; // n(n+1)/2
        const betaTerm = Math.pow(Math.max(1e-12, betaIn || 1), betaExp);
        s = Math.exp(r * tri) * betaTerm;
    }
    else {
        const n = lifeYears;
        s = Math.exp(betaIn * r * (1 + (n - 1) / n));
    }
    // 5) 당기 상각 & 장부가
    const beginBV = cost - dailyBase * elapsed;
    const adjDaily = dailyBase * (1 + usagePct);
    let bookAfter = beginBV - adjDaily * period;
    // 경계 보정
    if (clampToBounds)
        bookAfter = (0, shared_1.clamp)(bookAfter, salvage, cost);
    // 6) 재평가액(문서식 민감도 적용)
    let reval = bookAfter * s;
    // ----- Step 6: 트리거 로직 (교체본) -----
    // 입력 파라미터(없으면 기본값)
    const impDeduct = Math.abs((0, shared_1.toNumberLoose)(input.impairmentDeductPct, 0.30)); // 손상 30% 공제
    const t3IncThresh = Math.abs((0, shared_1.toNumberLoose)(input.increaseRatioThreshold, 0.75)); // 증가율 75%
    const capMult = Math.max(1, (0, shared_1.toNumberLoose)(input.capMultiple, 2)); // ×2 cap
    const carryFwd = (0, shared_1.toNumberLoose)(input.carryForwardReval, 0);
    let t1 = false, t2 = false, t3 = false;
    let cappedAt = null;
    // NOTE: 위에서 이미 `let reval = bookAfter * s;` 선언됨. 여기서는 **재선언 금지**.
    let delta = reval - bookAfter;
    // (A) 하락 구간: 트리거 1 = 손상액의 30% 공제(즉 70%만 인식)
    if (delta < 0) {
        const loss = -delta;
        const recognizedLoss = loss * (1 - impDeduct); // 70%만 반영
        reval = bookAfter - recognizedLoss;
        delta = reval - bookAfter;
        t1 = true;
    }
    // (B) 상향 구간: 증가율 ≥ 75% & 재평가액 ≥ 취득가×2 → 트리거 3, cap 까지만 반영
    if (delta > 0) {
        const incRatio = bookAfter > 0 ? (delta / bookAfter) : Number.POSITIVE_INFINITY;
        const t3Eligible = (incRatio >= t3IncThresh) && (reval >= cost * 2);
        if (t3Eligible) {
            const cap = cost * capMult;
            if (reval > cap) {
                reval = cap;
                cappedAt = cap;
            }
            t3 = true;
        }
        // else: 일반 IFRS 재평가 경로(그대로 둠)
    }
    // (C) 전기 재평가이익 상쇄
    if (carryFwd !== 0) {
        reval = reval - carryFwd;
        t2 = true;
    }
    // 최종 경계 보정
    if (clampToBounds)
        reval = (0, shared_1.clamp)(reval, salvage, cost * capMult);
    // 나중에 결과에 넣을 트리거 플래그
    const triggers = { t1, t2, t3 };
    const out = {
        dailyDepreciationBase: R(dailyBase, roundStep),
        usageChangePct: R(usagePct, roundStep),
        adjustedDailyDepreciation: R(adjDaily, roundStep),
        sensitivityFactor: R(s, roundStep),
        bookValueAfterUse: R(bookAfter, roundStep),
        revaluationValue: R(reval, roundStep),
        triggers: { t1, t2, t3 },
        finalRevaluedValue: R(reval, roundStep),
    };
    if (debug) {
        out.debug = {
            inputs: {
                cost, salvage, lifeYears, lifeDays, elapsed, period,
                usagePct, beta: betaIn, r, nYears: lifeYears,
                psPrev: Number.isFinite(psPrev) ? psPrev : undefined,
                psCurr: Number.isFinite(psCurr) ? psCurr : undefined,
            },
            beginBV,
            depreciable,
            r, beta: betaIn, nYears: lifeYears,
            delta,
            cappedAt,
        };
    }
    return out;
}
