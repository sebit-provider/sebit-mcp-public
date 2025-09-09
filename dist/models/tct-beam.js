"use strict";
// =============================
// FILE: src/models/tct-beam.ts
// SEBIT-TCTBEAM: Trigonometric Cost Tracking & Break-Even Analysis Model
// - 문서 수식(고정비/변동비 비율 → 각도 a, sin/cos/tan 가중, BE 계산) 충실 구현
// - 입력 유연: 연도별 배열 또는 5년 합계/올해 값만으로도 동작
// =============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTCTBEAM = runTCTBEAM;
// --------- helpers ---------
const EPS = 1e-9;
const nz = (x, d = 0) => (Number.isFinite(+x) ? +x : d);
const R = (x, step = 1e-6) => Number.isFinite(x) ? Math.round(x / step) * step : x;
const toRad = (deg) => (deg * Math.PI) / 180;
// -180~180 정규화 + tan 특이점 회피(±90° 근처)
const clampDeg = (deg) => {
    let d = ((deg + 180) % 360 + 360) % 360 - 180;
    if (Math.abs(d) >= 89.999)
        d = d > 0 ? 89.999 : -89.999;
    return d;
};
const sumLastN = (arr, n) => {
    if (!arr || !arr.length)
        return 0;
    const s = Math.max(0, arr.length - n);
    let tot = 0;
    for (let i = s; i < arr.length; i++)
        tot += nz(arr[i], 0);
    return tot;
};
const last = (arr) => arr && arr.length ? nz(arr[arr.length - 1], 0) : undefined;
// --------- main ---------
function runTCTBEAM(input) {
    const step = nz(input.options?.roundStep, 1e-6);
    // === Step1: 5년 합산 ===
    const sumFixed5 = input.fixedCosts && input.fixedCosts.length
        ? sumLastN(input.fixedCosts, 5)
        : nz(input.fixedCostTotal5y, 0);
    const sumVar5 = input.variableCosts && input.variableCosts.length
        ? sumLastN(input.variableCosts, 5)
        : nz(input.variableCostTotal5y, 0);
    const totalCost5 = Math.max(sumFixed5 + sumVar5, EPS);
    const fixedRatio5 = sumFixed5 / totalCost5;
    const varRatio5 = sumVar5 / totalCost5;
    // === Step2-1: 전년 대비 비율 변화량 ===
    let yoyDeltaFixedRatio;
    let yoyDeltaVarRatio;
    const prevFixedFromArr = input.fixedCosts && input.fixedCosts.length >= 2
        ? nz(input.fixedCosts[input.fixedCosts.length - 2], 0)
        : undefined;
    const currFixedFromArr = last(input.fixedCosts);
    const prevVarFromArr = input.variableCosts && input.variableCosts.length >= 2
        ? nz(input.variableCosts[input.variableCosts.length - 2], 0)
        : undefined;
    const currVarFromArr = last(input.variableCosts);
    if (prevFixedFromArr !== undefined &&
        currFixedFromArr !== undefined &&
        prevVarFromArr !== undefined &&
        currVarFromArr !== undefined) {
        const prevTot = Math.max(prevFixedFromArr + prevVarFromArr, EPS);
        const currTot = Math.max(currFixedFromArr + currVarFromArr, EPS);
        const prevFr = prevFixedFromArr / prevTot;
        const currFr = currFixedFromArr / currTot;
        const prevVr = prevVarFromArr / prevTot;
        const currVr = currVarFromArr / currTot;
        yoyDeltaFixedRatio = currFr - prevFr;
        yoyDeltaVarRatio = currVr - prevVr; // (이론상 -yoyDeltaFixedRatio)
    }
    else if (input.fixedRatioPrevYear !== undefined &&
        input.fixedRatioThisYear !== undefined) {
        const prevFr = nz(input.fixedRatioPrevYear, 0);
        const currFr = nz(input.fixedRatioThisYear, 0);
        yoyDeltaFixedRatio = currFr - prevFr;
        yoyDeltaVarRatio =
            input.variableRatioPrevYear !== undefined &&
                input.variableRatioThisYear !== undefined
                ? nz(input.variableRatioThisYear, 0) - nz(input.variableRatioPrevYear, 0)
                : -yoyDeltaFixedRatio;
    }
    // === Step3: a(각 변화율→각도), 누적 각도 ===
    const thetaPrevDeg = nz(input.prevAccumAngle, 0);
    const deltaThetaDeg = input.deltaAngleThisYear !== undefined
        ? nz(input.deltaAngleThisYear, 0)
        : nz(yoyDeltaVarRatio, 0) * 180;
    const thetaNowDeg = clampDeg(thetaPrevDeg + deltaThetaDeg);
    const tanTheta = Math.tan(toRad(thetaNowDeg));
    // === 올해 기준치(고정/변동) ===
    const baseFixed = currFixedFromArr ??
        nz(input.currentYearFixed, 0) ??
        (input.fixedCostTotal5y ? nz(input.fixedCostTotal5y, 0) / 5 : 0);
    const baseVar = currVarFromArr ??
        nz(input.currentYearVariable, 0) ??
        (input.variableCostTotal5y ? nz(input.variableCostTotal5y, 0) / 5 : 0);
    // 삼각 가중치 (문서: 고정비→sin, 변동비→cos, 비음수 가중)
    const fixedAdj = Math.abs(Math.sin(toRad(thetaNowDeg))) * baseFixed;
    const varAdj = Math.abs(Math.cos(toRad(thetaNowDeg))) * baseVar;
    const totalCostThisYear = fixedAdj + varAdj;
    // 수익/손익
    const revenueThisYear = input.currentRevenue !== undefined
        ? nz(input.currentRevenue, 0)
        : baseFixed + baseVar; // 보수 가정
    const operatingProfit = revenueThisYear * tanTheta;
    // 손익분기점 (BE = 고정비 / (1 - 변동비율))
    const currTotal = Math.max(baseFixed + baseVar, EPS);
    const varRatioThisYear = input.variableRatioThisYear !== undefined
        ? nz(input.variableRatioThisYear, 0)
        : baseVar / currTotal;
    const breakEvenRevenue = 1 - varRatioThisYear > EPS
        ? baseFixed / (1 - varRatioThisYear)
        : Infinity;
    // 플래그
    const flags = {
        near90Singularity: Math.abs(Math.abs(thetaNowDeg) - 90) < 0.1,
        crossed180: Math.sign(thetaPrevDeg) !== Math.sign(thetaNowDeg) &&
            Math.abs(thetaPrevDeg - thetaNowDeg) > 179.0,
        breakEvenZone: Math.abs(operatingProfit) < 1e-6,
    };
    // === 반환(반올림 적용) ===
    return {
        sumFixed5: R(sumFixed5, step),
        sumVar5: R(sumVar5, step),
        totalCost5: R(totalCost5, step),
        fixedRatio5: R(fixedRatio5, step),
        varRatio5: R(varRatio5, step),
        yoyDeltaFixedRatio: yoyDeltaFixedRatio !== undefined ? R(yoyDeltaFixedRatio, step) : undefined,
        yoyDeltaVarRatio: yoyDeltaVarRatio !== undefined ? R(yoyDeltaVarRatio, step) : undefined,
        thetaPrevDeg: R(thetaPrevDeg, step),
        deltaThetaDeg: R(deltaThetaDeg, step),
        thetaNowDeg: R(thetaNowDeg, step),
        tanTheta: R(tanTheta, step),
        baseFixed: R(baseFixed, step),
        baseVar: R(baseVar, step),
        adjustedVar: R(varAdj, step),
        totalCostThisYear: R(totalCostThisYear, step),
        revenueThisYear: R(revenueThisYear, step),
        operatingProfit: R(operatingProfit, step),
        breakEvenRevenue: R(breakEvenRevenue, step),
        flags,
    };
}
