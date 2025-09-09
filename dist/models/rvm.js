"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRVM = runRVM;
// =============================
// FILE: /src/models/rvm.ts
// SEBIT-RVM: Resource Valuation Model (spec-aligned, robust)
// =============================
const shared_1 = require("./shared");
function runRVM(input) {
    const EPS = 1e-12;
    const roundStep = input?.options?.roundStep ?? 1e-6;
    const R = (x) => Math.round(x / roundStep) * roundStep;
    // 1) 수량 기준 평균들 (항상 계산)
    const avgDaily = (0, shared_1._div)(input.cumulativeMinedValue, Math.max(1, input.cumulativeMiningDays), 0);
    const actualDaily = (0, shared_1._div)(input.currentPeriodMinedValue, Math.max(1, input.currentPeriodMiningDays), 0);
    const dailyAvgMinedValue = avgDaily;
    // 2) 가격이 주어지면 금액 기반 보조지표 생성
    const price = input.currentResourcePrice ?? input.unitPrice;
    let valueBaseline;
    let valueTotal;
    let changePct;
    if (Number.isFinite(+price)) {
        const p = +price;
        valueBaseline = avgDaily * p;
        valueTotal = actualDaily * p;
        changePct = (0, shared_1._div)((valueTotal - valueBaseline), Math.max(EPS, valueBaseline), 0);
    }
    // 3) r 계산 (우선순위: marketChangeR → ln(curr/prev))
    const currVal = input.currentValuation ?? 0;
    const prevVal = input.prevYearValuation ?? 0;
    const rRaw = Number.isFinite(input.marketChangeR)
        ? +input.marketChangeR
        : (prevVal > 0 && currVal > 0 && Math.abs(currVal - prevVal) > EPS ? Math.log(currVal / prevVal) : 0);
    const r = R(rRaw);
    // 4) 민감도
    const beta = +(input.beta ?? 0);
    const s = (0, shared_1.calcSensitivity)(r, beta, input.usefulLifeYears ?? 1, "decrement");
    const sensitivityFactor = R(s);
    // 5) 최종 재평가가치 (단위 일관성 유지)
    const unitFactor = Number.isFinite(+price) ? +price : 1; // 가격 없으면 수량 단위 유지
    const revaluedResourceValue = R((input.currentPeriodMinedValue ?? 0) * unitFactor * s);
    return {
        dailyAvgMinedValue: R(dailyAvgMinedValue),
        baselineVsActualRatio: R((0, shared_1._div)(actualDaily, Math.max(EPS, avgDaily), 0)),
        ...(valueBaseline !== undefined ? { valueBaseline: R(valueBaseline) } : {}),
        ...(valueTotal !== undefined ? { valueTotal: R(valueTotal) } : {}),
        ...(changePct !== undefined ? { changePct: R(changePct) } : {}),
        r,
        sensitivityFactor,
        revaluedResourceValue,
    };
}
