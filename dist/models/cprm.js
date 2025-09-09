"use strict";
// =============================
// FILE: src/models/cprm.ts
// SEBIT-CPRM: Collateral-adjusted Probabilistic Risk Model (전환사채)
// - 문서 스텝 반영:
//   Step1 간주대손(비율/금액)  → Step2 전환사채율(대손/거래규모·시장스큐) → Step3 산정
//   Step4 과거 회수율 반영 → Step5 상품평균거래액/회전율 → Step6 β 보정 → Step7 임계치·cap
// - 기존 키/별칭 최대한 유지(스모크·클라 입력 호환)
// =============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCPRM = runCPRM;
// ---------- helpers ----------
const toRate = (x, d = 0) => {
    if (typeof x === 'string') {
        const s = x.trim();
        if (s.endsWith('%')) {
            const v = Number(s.replace(/[^\d.-]/g, ''));
            return Number.isFinite(v) ? v / 100 : d;
        }
    }
    const n = Number(x);
    // 숫자가 1보다 크면 백분율로 간주하고 100으로 나누기
    if (Number.isFinite(n)) {
        return n > 1 ? n / 100 : n;
    }
    return d;
};
const toNum = (x, d = 0) => (Number.isFinite(+x) ? +x : d);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const R = (x, step) => (typeof step === 'number' && step > 0) ? Math.round(x / step) * step : x;
function runCPRM(input) {
    const opt = input.options ?? {};
    const step = opt.roundStep;
    // === Base (Step3의 모수로 사용) ===
    const base = toRate(input.baseRate ?? input.baseCR ?? input.base, 0);
    // === Step1: 간주 대손(비율/금액)
    const badDebtRate = toRate(input.badDebtIncidence ?? input.expectedLossRate ?? input.badDebt ?? input.ddAdj, 0);
    const assumedPD = toRate(input.assumedDefaultRate ?? input.impliedPD ?? input.pd, 0);
    const badDebtAmount = toNum(input.badDebtAmount, 0);
    const assetBaseAmt = toNum(input.assetBaseAmount, 0);
    // === Step2: 전환사채율 λ = ((대손금액) / (단위×거래량)) × ln(buy/sell)
    const bondUnit = toNum(input.bondUnitPrice ?? input.unitPrice, 1);
    const bondVol = toNum(input.bondVolume ?? input.volume, 1);
    const buyAmt = toNum(input.buyAmount ?? input.grossBuy, 1);
    const sellAmt = toNum(input.sellAmount ?? input.grossSell, 1);
    const marketSkew = Math.log(Math.max(buyAmt, 1) / Math.max(sellAmt, 1)); // ln(buy/sell)
    const debtComponent = badDebtAmount > 0
        ? badDebtAmount
        : (assetBaseAmt > 0 ? badDebtRate * assumedPD * assetBaseAmt : 0);
    const denom = Math.max(bondUnit * bondVol, 1e-9);
    const convRate = (debtComponent / denom) * marketSkew || 0; // 전환사채율 기여분
    // convRate 반영
    let afterBadDebt = clamp(base * (1 + convRate), 0, 1);
    // === Step4: 과거 회수율 반영(감액)
    const rec1y = toRate(input.pastDebtorRecovery ?? input.recoveryRatio1y ?? input.rec1y, 0);
    afterBadDebt = clamp(afterBadDebt * (1 - rec1y), 0, 1);
    // === Step5+6: β 문서식 보정
    // β = ln( (상품평균거래액/회수율) / (사채회전율/주식회전율) )
    const avgTradeAmt1y = toNum(input.productAvgTradeAmt1y ?? input.avgTradeAmount1y, 0);
    const bondTurnPct = toRate(input.bondTurnoverPct ?? input.bondTurnover, 0);
    const stockTurnPct = toRate(input.stockTurnoverPct ?? input.stockTurnover, 0);
    let betaDoc = 0;
    if (avgTradeAmt1y > 0 && rec1y > 0 && bondTurnPct > 0 && stockTurnPct > 0) {
        betaDoc = Math.log((avgTradeAmt1y / rec1y) / (bondTurnPct / stockTurnPct));
    }
    // 과도한 발산 방지(필요시 옵션화)
    betaDoc = Math.max(-0.5, Math.min(0.5, betaDoc));
    let provisionalRate = clamp(afterBadDebt * (1 + betaDoc), 0, 1);
    // === Step7: 임계치/공제/cap
    // 임계치: 10% — true면 extraAdj 공제
    // extraAdj는 부호 상관없이 절대값 사용(문서상 “공제” 의미)
    const extraAdjRaw = toRate(input.extraAdj ?? input.extraAdjRate ?? input.extAdj, 0);
    const extraAdjRate = Math.abs(extraAdjRaw); // 공제율(+)
    const maxCap = toRate(input.maxValue ?? input.cap ?? '35%', 0.35);
    const maxByStock = !!(input.caps?.maxByStockTrading);
    let finalRate = provisionalRate;
    if (finalRate >= 0.10 && !maxByStock) {
        finalRate = finalRate * (1 - extraAdjRate);
    }
    finalRate = Math.min(finalRate, maxCap);
    const out = {
        rawRate: R(base, step),
        afterBadDebt: R(afterBadDebt, step),
        sensitivityFactor: R(1 + betaDoc, step), // 호환 필드
        dynRate: R(provisionalRate, step),
        extraAdjRate: R(extraAdjRate, step),
        provisionalRate: R(provisionalRate, step),
        finalRate: R(finalRate, step),
        chosen: finalRate >= 0.10 ? 'thresholdAdj' : 'base',
        triggers: {
            t10Plus: finalRate >= 0.10,
            tFrac: true,
            tSub: extraAdjRate > 0,
            tCapped: finalRate >= maxCap
        },
        debug: opt.debug ? {
            inputs: {
                base,
                badDebtRate, assumedPD,
                badDebtAmount, assetBaseAmt,
                bondUnit, bondVol, buyAmt, sellAmt, marketSkew,
                rec1y, avgTradeAmt1y, bondTurnPct, stockTurnPct,
                extraAdjRate: extraAdjRate, maxCap
            },
            convRate,
            betaDoc
        } : undefined
    };
    return out;
}
