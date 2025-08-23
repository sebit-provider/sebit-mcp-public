"use strict";
// =============================
// FILE: /src/models/belm.ts
// SEBIT-BELM: Bad Debt Expected Loss Model
// =============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBELM = runBELM;
// NaN/∞/undefined 방지용 미니 가드
const num = (v, d = 0) => (v === null || v === undefined ? d : (Number.isFinite(+v) ? +v : d));
const clamp01 = (x) => Math.max(0, Math.min(1, num(x, 0)));
function runBELM(input) {
    const expectedRepayToDate = num(input?.expectedRepayToDate, 0);
    const interestAmount = num(input?.interestAmount, 0);
    const contribRatio = num(input?.contribRatio, 0.2);
    const baseELRate = num(input?.baseELRate, 0.02);
    let repayPerfFraction = input?.prevPerf;
    if (!Number.isFinite(+repayPerfFraction)) {
        const denom = expectedRepayToDate + interestAmount;
        repayPerfFraction = denom ? expectedRepayToDate / denom : 0.6; // 기본치
    }
    repayPerfFraction = clamp01(repayPerfFraction);
    const adjustedELRate = num(baseELRate + (1 - repayPerfFraction) * contribRatio, 0);
    const finalELRate = num(adjustedELRate + baseELRate, adjustedELRate);
    const exposure = num(expectedRepayToDate + interestAmount, expectedRepayToDate);
    const allowance = num(exposure * finalELRate, 0);
    return {
        expectedRepayToDate,
        interestAmount,
        contribRatio,
        repayPerfFraction,
        adjustedELRate,
        finalELRate,
        allowance,
    };
}
