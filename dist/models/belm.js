"use strict";
// belm.ts — SEBIT-BELM (Bad Debt Expected Loss Model)
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBELM = runBELM;
const nz = (x, d = 0) => (Number.isFinite(+x) ? +x : d);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const toRate = (n) => {
    const num = nz(n, 0);
    return num > 1 ? num / 100 : num;
};
function runBELM(input) {
    const eps = 1e-9;
    // Step 1
    const totalDebt = nz(input.dailyExpectedSettlement, 0) * nz(input.usefulLifeYears, 0) * 365;
    // Step 2
    const expectedToDate = nz(input.dailyExpectedSettlement, 0) * nz(input.elapsedDays, 0);
    // Step 3
    const actual = nz(input.actualSettlementToDate, 0);
    const diff = (totalDebt - expectedToDate) - (expectedToDate - actual);
    const interestAdjFactor = totalDebt > 0 ? 1 + diff / totalDebt : 1;
    // Step 4
    const baseForInterest = Math.max(0, totalDebt - actual);
    const interestExpense = baseForInterest * (toRate(input.interestRate) * interestAdjFactor);
    // Step 5
    const preAdjELR = nz(input.totalExposure, 0) > 0
        ? nz(input.clientExposure, 0) / nz(input.totalExposure, 0)
        : 0;
    // Step 6
    const prevYearShare = nz(input.prevYearTotalSettlement, 0) > 0
        ? nz(input.prevYearClientSettlement, 0) / nz(input.prevYearTotalSettlement, 0)
        : 0;
    let finalELR = preAdjELR + prevYearShare + toRate(input.extraAdjPct);
    if (input.clampELR01 !== false)
        finalELR = clamp01(finalELR);
    const expectedLossAmount = totalDebt * finalELR;
    return {
        totalDebt,
        expectedToDate,
        interestAdjFactor,
        interestExpense,
        preAdjELR,
        prevYearShare,
        finalELR,
        expectedLossAmount,
        debug: {
            diff,
            baseForInterest,
            params: {
                dailyExpectedSettlement: input.dailyExpectedSettlement,
                usefulLifeYears: input.usefulLifeYears,
                elapsedDays: input.elapsedDays,
                actualSettlementToDate: input.actualSettlementToDate,
                interestRate: input.interestRate,
                clientExposure: input.clientExposure,
                totalExposure: input.totalExposure,
                prevYearClientSettlement: input.prevYearClientSettlement ?? 0,
                prevYearTotalSettlement: input.prevYearTotalSettlement ?? 0,
                extraAdjPct: input.extraAdjPct ?? 0,
            },
        },
    };
}
