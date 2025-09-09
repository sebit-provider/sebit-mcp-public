"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCEEM = runCEEM;
// =============================
// FILE: src/models/ceem.ts
// SEBIT-CEEM: Consumable Expense Evaluation Model (aliases-friendly)
// =============================
const shared_1 = require("./shared");
const roundTo = (v, step = 1e-6) => Math.round((v ?? 0) / step) * step;
function runCEEM(input) {
    const opt = input.options ?? {};
    const step = (0, shared_1._nz)(opt.roundStep, 1e-6);
    // ---------- 1) 일일 평균사용량 ----------
    const cumUseRaw = input.cumulativeUsage ??
        input.cumulativeUsageQty ??
        0;
    const cumDaysRaw = input.cumulativeUsageDays ??
        input.cumulativeDays ??
        0;
    const cumUse = (0, shared_1._nz)(+cumUseRaw, 0);
    const cumDays = Math.max(1, (0, shared_1._nz)(+cumDaysRaw, 1));
    const dailyAvgUsage = (0, shared_1._div)(cumUse, cumDays, 0);
    // 단가
    const unitCost = (0, shared_1._nz)(+input.unitCost, 0);
    // ---------- 2) 기준/총 사용가치 ----------
    // 기준 연사용량: 명시값 > baselineDailyUsage*365 > 일평균*365
    const baselineAnnualUsage = (input.baselineAnnualUsage != null)
        ? (0, shared_1._nz)(+input.baselineAnnualUsage, 0)
        : (input.baselineDailyUsage != null)
            ? (0, shared_1._nz)(+input.baselineDailyUsage, 0) * 365
            : dailyAvgUsage * 365;
    // 기간 일수(이번 기간)
    const periodDays = Math.max(1, (0, shared_1._nz)(+(input.periodDays ?? input.currentDays ?? 365), 365));
    // 이번 기간 총 사용량: 명시값 > currentUsageQty > actualDailyUsage*periodDays > expenseThisPeriod/unitCost > 일평균*periodDays
    const totalUsage = (input.totalUsage != null)
        ? (0, shared_1._nz)(+input.totalUsage, 0)
        : (input.currentUsageQty != null)
            ? (0, shared_1._nz)(+input.currentUsageQty, 0)
            : (input.actualDailyUsage != null)
                ? (0, shared_1._nz)(+input.actualDailyUsage, 0) * periodDays
                : (input.expenseThisPeriod != null && unitCost > 0)
                    ? (0, shared_1._nz)(+input.expenseThisPeriod, 0) / unitCost
                    : dailyAvgUsage * periodDays;
    const baselineValue = baselineAnnualUsage * unitCost;
    const totalValue = totalUsage * unitCost;
    // ---------- 3) 사용변화율 ----------
    const usageChangePct = (0, shared_1._div)(totalValue - baselineValue, baselineValue, 0);
    // ---------- 4) 시장변화율 r ----------
    // 문서: r = ln( Pβ / (1+prevYearR)^(1/12) )
    // prevYearR 별칭: marketChangeR
    const Pbeta = Math.max(1e-12, 1 + usageChangePct);
    const prevR = (0, shared_1.toFrac)(input.prevYearR ?? input.marketChangeR ?? 0);
    const monthlyFactor = Math.pow(1 + prevR, 1 / 12);
    const r = Math.log(Pbeta / Math.max(1e-12, monthlyFactor));
    // ---------- 5) 시장계수 ----------
    const n = Math.max(1, (0, shared_1._nz)(+(input.years ?? input.usefulLifeYears ?? 1), 1));
    const beta = Math.max(1e-12, (0, shared_1._nz)(+input.beta, 1)); // 최소 보호
    const marketIndex = Math.exp(r * n) * beta;
    // ---------- 6) 재평가 비용 ----------
    const reappraisedConsumableCost = totalValue * marketIndex;
    const out = {
        dailyAvgUsage: roundTo(dailyAvgUsage, step),
        baselineValue: roundTo(baselineValue, step),
        totalValue: roundTo(totalValue, step),
        usageChangePct: roundTo(usageChangePct, step),
        r: roundTo(r, step),
        marketIndex: roundTo(marketIndex, step),
        reappraisedConsumableCost: roundTo(reappraisedConsumableCost, step),
    };
    if (opt.debug) {
        out.debug = {
            inputs: {
                cumUse, cumDays, unitCost,
                baselineAnnualUsage, totalUsage, periodDays,
                prevR, beta, n,
                usedAliases: {
                    cumulativeUsage: input.cumulativeUsage ?? input.cumulativeUsageQty,
                    cumulativeDays: input.cumulativeUsageDays ?? input.cumulativeDays,
                    totalUsage: input.totalUsage ?? input.currentUsageQty ?? input.actualDailyUsage ?? input.expenseThisPeriod,
                    periodDays: input.periodDays ?? input.currentDays,
                    prevYearR: input.prevYearR ?? input.marketChangeR,
                    years: input.years ?? input.usefulLifeYears,
                },
            },
            Pbeta, monthlyFactor,
        };
    }
    return out;
}
