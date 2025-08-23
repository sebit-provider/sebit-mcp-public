"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
process.on('unhandledRejection', (e) => { console.error('[SMOKE] UnhandledRejection:', e); process.exit(1); });
process.on('uncaughtException', (e) => { console.error('[SMOKE] UncaughtException:', e); process.exit(1); });
const models_1 = require("../models");
(async function main() {
    console.log('[SMOKE] start');
    const cases = [
        ['dda', () => (0, models_1.runDDA)({
                acquisitionCost: 100000,
                residualValue: 10000,
                usefulLifeYears: 10,
                elapsedUseDays: 365, // 예전/새 타입 혼재 → 테스트에선 느슨하게
                periodUseDays: 100,
                usageChangeR: '20%',
                beta: 0.08,
                marketChangeR: 0.02,
                options: { debug: true }
            })],
        ['lam', () => (0, models_1.runLAM)({
                rightOfUseAsset: 50000,
                leaseTermYears: 5,
                currentPeriodDays: 365,
                usePatternAdj: 1.2,
                interestRate: 0.06
            })],
        ['rvm', () => (0, models_1.runRVM)({ cumulativeMinedValue: 30000, cumulativeMiningDays: 100,
                currentPeriodMinedValue: 4000, currentPeriodMiningDays: 10,
                prevYearValuation: 200000, beta: 0.05, usefulLifeYears: 5, marketChangeR: 0.02 })],
        ['ceem', () => (0, models_1.runCEEM)({ baselineDailyUsage: 100, actualDailyUsage: 120, expenseThisPeriod: 9000,
                usefulLifeYears: 5, marketChangeR: 0.015, beta: 0.03, options: { debug: true } })],
        ['bdm', () => (0, models_1.runBDM)({ carryingAmountStart: '980', faceValue: '1,000',
                couponRateAnnual: '5%', yieldRateAnnual: '6%', periodsPerYear: 2,
                options: { roundStep: 1e-6, debug: true } })],
        ['belm', () => (0, models_1.runBELM)({ expectedRepayToDate: 30000, interestAmount: 16000, contribRatio: 0.2,
                baseELRate: 0.02, prevPerf: 0.66 })],
        ['cprm', () => (0, models_1.runCPRM)({ baseCR: 0.4, ddAdj: -0.0013333333, extraAdj: 0.03,
                caps: { maxByStockTrading: false }, options: { roundStep: 1e-6, debug: true } })],
        ['ocim', () => (0, models_1.runOCIM)({ ociShare: '25%', baseRate: '8%', years: 2, options: { debug: true } })],
        ['farex', () => (0, models_1.runFAREX)({ currentExchangeRate: 1300,
                prevYearPrevMonthExport: 1000, prevYearPrevMonthImport: 800,
                currentYearPrevMonthExport: 1100, currentYearPrevMonthImport: 850,
                prevYearCurrentMonthExport: 1200, prevYearCurrentMonthImport: 900 })],
        ['tctbeam', () => (0, models_1.runTCTBEAM)({ fixedCostTotal5y: 5000000, variableCostTotal5y: 6500000,
                fixedRatioThisYear: 1, variableRatioThisYear: 1,
                prevAccumAngle: 180, deltaAngleThisYear: 5 })],
        ['cpmrv', () => (0, models_1.runCPMRV)({
                currentYearGrowthRate: 15,
                currentYearDeclineRate: 5,
                previousYearGrowthRate: 20,
                previousYearDeclineRate: 10,
                currentCryptocurrencyValue: 50000
            })],
        ['dcbpra', () => (0, models_1.runDCBPRA)({ pctAdjust: 0.88, baseReturn: 0.06, beta: 2.2,
                options: { allowInfinity: false, epsilonGuard: 1e-8, roundStep: 1e-6, debug: true } })],
    ];
    for (const [name, fn] of cases) {
        try {
            const out = fn();
            console.log(`\n=== ${name.toUpperCase()} ===\n${JSON.stringify(out, null, 2)}`);
        }
        catch (e) {
            console.error(`\n*** ${name.toUpperCase()} ERROR:\n`, e?.stack || e?.message || e);
            process.exitCode = 1;
        }
    }
    console.log('\n[SMOKE] done');
})();
