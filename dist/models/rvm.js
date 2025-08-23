"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRVM = runRVM;
// =============================
// FILE: /src/models/rvm.ts
// SEBIT-RVM: Resource Valuation Model
// =============================
const shared_1 = require("./shared");
function runRVM(input) {
    const dailyAvgMinedValue = (0, shared_1._div)(input.cumulativeMinedValue, Math.max(1, input.cumulativeMiningDays), 0);
    const actualDaily = (0, shared_1._div)(input.currentPeriodMinedValue, Math.max(1, input.currentPeriodMiningDays), 0);
    const baselineVsActualRatio = (0, shared_1._div)(actualDaily, dailyAvgMinedValue, 0);
    const r = (0, shared_1._nz)(input.marketChangeR ?? (input.prevYearValuation ? (0, shared_1._div)(input.currentPeriodMinedValue - (input.prevYearValuation || 0), input.prevYearValuation || 1, 0) : 0));
    const beta = (0, shared_1._nz)(input.beta ?? 0);
    const sensitivityFactor = (0, shared_1.calcSensitivity)(r, beta, input.usefulLifeYears, 'decrement');
    const revaluedResourceValue = (input.currentPeriodMinedValue || 0) * (sensitivityFactor || 1);
    return { dailyAvgMinedValue, baselineVsActualRatio, r, sensitivityFactor, revaluedResourceValue };
}
