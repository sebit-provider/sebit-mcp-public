"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDDA = runDDA;
// =============================
// DDA: Dynamic Depreciation Adjustment (방탄 가드 버전)
// =============================
const shared_1 = require("./shared");
// 서명 + 버전 로그
// @sebit-dda: v2-guard
const DBG = (...a) => { try {
    console.debug('[DDA]', ...a);
}
catch { } };
// ---------- helpers ----------
const safe = (x, name, def = 0) => {
    const v = Number(x);
    if (!Number.isFinite(v)) {
        DBG(`NaN/${name} -> default(${def})`, x);
        return def;
    }
    return v;
};
const R = (x, step) => safe((0, shared_1.roundTo)(safe(x, 'roundSrc'), step), 'roundOut');
// 민감도(완만형)
function sensitivity(beta, r, yrs) {
    const y = Math.max(1, (0, shared_1.toNumberLoose)(yrs, 1));
    const val = Math.exp((0, shared_1.toNumberLoose)(beta, 0) * (0, shared_1.toNumberLoose)(r, 0) * (1 + (y - 1) / y));
    return safe(val, 'sensitivity', 1);
}
// 입력 별칭 정규화
function normalize(input) {
    const cost = (0, shared_1.toNumberLoose)(input.acquisitionCost ?? input.assetCost ?? input.cost, 0);
    const salvage = (0, shared_1.toNumberLoose)(input.residualValue ?? input.salvageValue ?? input.salvage, 0);
    const lifeYears = (0, shared_1.toNumberLoose)(input.usefulLifeYears ?? input.lifeYears, 1);
    const elapsed = (0, shared_1.toNumberLoose)(input.elapsedUseDays ?? input.elapsedDays, 0);
    const period = (0, shared_1.toNumberLoose)(input.periodUseDays ?? input.currentPeriodUseDays, 0);
    const usageR = (0, shared_1.toFrac)(input.usageChangeR ?? input.usageChangePct ?? 0);
    const beta = (0, shared_1.toFrac)(input.beta ?? 0);
    const r = (0, shared_1.toFrac)(input.marketChangeR ?? 0);
    const roundStep = (0, shared_1.toNumberLoose)(input.options?.roundStep, 1e-6);
    const clampToBounds = (input.options?.clampToBounds ?? true);
    const debug = !!input.options?.debug;
    return { cost, salvage, lifeYears, elapsed, period, usageR, beta, r, roundStep, clampToBounds, debug };
}
// ---------- core ----------
function runDDA(input) {
    DBG('v2-guard path hit');
    const N = normalize(input);
    // 기초 값들 방탄 보정
    const daysInYear = 365;
    const lifeDays = Math.max(1, Math.round(safe(N.lifeYears, 'lifeYears') * daysInYear));
    const elapsed = Math.max(0, Math.min(safe(N.elapsed, 'elapsed'), lifeDays));
    const period = Math.max(0, Math.min(safe(N.period, 'period'), lifeDays - elapsed));
    const cost = safe(N.cost, 'cost', 0);
    const salvage = (0, shared_1.clamp)(safe(N.salvage, 'salvage', 0), 0, cost);
    const depreciable = Math.max(0, cost - salvage);
    const usageR = (0, shared_1.clamp)(safe(N.usageR, 'usageR', 0), -0.99, 10); // 과도한 입력 방지
    const beta = (0, shared_1.clamp)(safe(N.beta, 'beta', 0), 0, 1);
    const r = (0, shared_1.clamp)(safe(N.r, 'r', 0), -1, 1);
    // 1) 일일 기본 감가
    const dailyBase = safe((0, shared_1.div)(depreciable, lifeDays, 0), 'dailyBase');
    // 2) 사용량 변동 반영
    const adjDaily = safe(dailyBase * (1 + usageR), 'adjDaily');
    // 3) 기초 장부가 및 당기 반영
    const beginBV = safe(cost - dailyBase * elapsed, 'beginBV', cost);
    let bookAfter = safe(beginBV - adjDaily * period, 'bookAfter', beginBV);
    // 4) 민감도
    const s = sensitivity(beta, r, N.lifeYears);
    // 5) 재평가액
    let reval = safe(bookAfter * s, 'reval', bookAfter);
    // 6) 트리거
    const triggers = { t1: false, t2: false, t3: true };
    if (s > 2)
        triggers.t1 = true;
    if (usageR >= .5)
        triggers.t2 = true;
    if (triggers.t1 || triggers.t2)
        triggers.t3 = false;
    // 7) 경계 클램프
    if (N.clampToBounds) {
        bookAfter = (0, shared_1.clamp)(bookAfter, salvage, cost);
        reval = (0, shared_1.clamp)(reval, salvage, cost);
    }
    const out = {
        dailyDepreciationBase: R(dailyBase, N.roundStep),
        usageChangePct: R(usageR, N.roundStep),
        adjustedDailyDepreciation: R(adjDaily, N.roundStep),
        sensitivityFactor: R(s, N.roundStep),
        bookValueAfterUse: R(bookAfter, N.roundStep),
        revaluationValue: R(reval, N.roundStep),
        triggers,
        finalRevaluedValue: R(reval, N.roundStep),
    };
    if (N.debug) {
        out.debug = {
            cost, salvage, lifeYears: N.lifeYears, elapsedDays: elapsed, periodDays: period,
            beginBV, depreciable, r, beta
        };
    }
    return out;
}
