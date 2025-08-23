"use strict";
/*
  Quick smoke tests for SEBIT models.
  Run with: npx ts-node src/tests/smoke.test.ts
*/
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../models");
function section(title) {
    console.log("\n\n=== " + title + " ===");
}
// 1) DDA — trigger & usagePct check
section("DDA");
console.log((0, models_1.runDDA)({
    acquisitionCost: 100000,
    bookValue: 80000,
    residualValue: 5000,
    totalDays: 1200,
    unusedDays: 100,
    daysUsedThisPeriod: 90,
    baselineUsageHours: 1000,
    totalUsageHours: 1200,
    usefulLifeYears: 5,
    marketChangeR: 0.03,
    beta: 1.2,
    triggerUsagePct: 75,
    triggerRevalMultiple: 2
}));
// 2) LAM — amortization + EIR interest
section("LAM");
console.log((0, models_1.runLAM)({
    acquisitionCost: 50000,
    residualValue: 0,
    discountRate: 0.06,
    leaseTermYears: 5,
    daysUsedThisPeriod: 90,
    totalDays: 365,
    unusedDays: 0,
    baselineUsageHours: 500,
    totalUsageHours: 600,
    options: { mode: "raw" },
}));
// 3) RVM — resource sensitivity (decrement scheme)
section("RVM");
console.log((0, models_1.runRVM)({
    cumulativeMiningDays: 400,
    cumulativeMinedValue: 120000,
    currentPeriodMiningDays: 30,
    currentPeriodMinedValue: 12000,
    prevYearValuation: 100000,
    marketChangeR: 0.02,
    beta: 1.1,
    usefulLifeYears: 6,
    options: { mode: "raw" },
}));
// 4) CEEM — e^{(r*beta)*n(n+1)/2}
section("CEEM");
console.log((0, models_1.runCEEM)({
    cumulativeDays: 365,
    cumulativeUsageQty: 36500, // 100/day avg
    currentDays: 30,
    currentUsageQty: 3600, // 120/day
    unitCost: 2.5,
    prevYearExpense: 80000,
    marketChangeR: 0.015,
    beta: 0.9,
    usefulLifeYears: 2 // exponent sum = 3
}));
// 5) BDM — effective interest one period
section("BDM");
console.log((0, models_1.runBDM)({
    faceValue: 1000,
    issuePrice: 980,
    couponRate: 0.05,
    marketYield: 0.06,
    yearsToMaturity: 5,
    periodsPerYear: 2
}));
// 6) BELM — fraction rule (<1 add, >1 reduce)
section("BELM");
console.log((0, models_1.runBELM)({
    dailyExpectedRepay: 1000,
    elapsedDays: 30,
    actualRepayToDate: 20000, // < expected(30k) => EL up
    balanceByCounterparty: 200000,
    totalARBalance: 1000000,
    nominalInterestRate: 0.08,
    baseELRate: 0.02,
    priorPeriodRecoveryRatio: 0.3,
    options: { clamp01: false },
}));
// 7) CPRM — conversion rate adj
section("CPRM");
console.log('\n\n=== CPRM — base ===');
{
    const input = {
        baseCR: 0.345,
        ddAdj: 0.02 // 2% → adjFactor=0.083333…
    };
    const out = (0, models_1.runCPRM)(input);
    console.log(JSON.stringify(out, null, 2));
}
console.log('\n=== CPRM — extraAdj (분수식 트리거 경로) ===');
{
    const input = {
        baseCR: 0.345,
        ddAdj: 0.02,
        extraAdj: 0.03, // 추가 공제 3%
        options: { roundStep: 1e-6, debug: true },
    };
    const out = (0, models_1.runCPRM)(input);
    console.log(JSON.stringify(out, null, 2));
}
console.log('\n=== CPRM — extraAdj 음수 (차감식 경로) ===');
{
    const input = {
        baseCR: 0.345,
        ddAdj: 0.02,
        extraAdj: -0.02 // 음수 → 차감식 우선
    };
    const out = (0, models_1.runCPRM)(input);
    console.log(JSON.stringify(out, null, 2));
}
console.log('\n=== CPRM — cap(주식거래액 상한) 적용 ===');
{
    const input = {
        baseCR: 0.6,
        ddAdj: 0.0,
        extraAdj: 0.05,
        caps: { maxByStockTrading: true, maxValue: 0.55 }, // 상한=0.55
        options: { roundStep: 1e-6 },
    };
    const out = (0, models_1.runCPRM)(input);
    console.log(JSON.stringify(out, null, 2));
}
console.log('\n=== CPRM — Claude 스타일 페이로드(자동 매핑) ===');
{
    // Claude가 보낸 형태 그대로 → aliasToCPRM로 baseCR/ddAdj/extraAdj 파생
    const input = {
        bondUnitPrice: 1000,
        badDebtOccurred: 5000,
        totalBondAssets: 500000,
        totalBondVolume: 100,
        badDebtProvision: 10000,
        buyTransactionAmount: 80000,
        convertibleBondAmount: 200000,
        sellTransactionAmount: 70000,
        options: { debug: true, roundStep: 1e-6 }
    };
    const out = (0, models_1.runCPRM)(input);
    console.log(JSON.stringify(out, null, 2));
}
// 8) OCIM — n-1 dampening
section("OCIM");
console.log((0, models_1.runOCIM)({
    ociShare: 0.25,
    baseRate: 0.08,
    years: 3,
    prevQuarterEffectiveRate: undefined
}));
// 9) FAREX — negative loop case
section("FAREX");
console.log((0, models_1.runFAREX)({
    lastYearPrevMonthExportShare: 12.4,
    lastYearThisMonthExportShare: 11.7,
    thisYearPrevMonthExportShare: 11.1,
    currentFX: 1320,
}));
// 10) TCT-BEAM — breakeven flag + optional sign flip
section("TCT-BEAM");
console.log((0, models_1.runTCTBEAM)({
    fixedCostTotal5y: 5000000,
    variableCostTotal5y: 6500000,
    fixedRatioThisYear: 0.55,
    variableRatioThisYear: 0.45,
    prevAccumAngle: 170,
    deltaAngleThisYear: 15, // crosses 180°
    options: { breakevenPostFlip: true },
}));
// 11) CPMRV — baseline/YTD average then monthly
section("CPMRV");
console.log((0, models_1.runCPMRV)({
    lastYearAvgGrowth: 0.24, // ln 기반 평균치라고 가정
    lastYearAvgDrawdown: 0.12,
    ytdGrowth: 0.18,
    ytdDrawdown: 0.10,
    fairValueToday: 1000000,
    options: { mode: "raw" },
}));
// 12) DCBPRA — RS fractional adjust; show allowInfinity toggle
section("DCBPRA — allowInfinity:true");
console.log((0, models_1.runDCBPRA)({
    actualGrowthRate: -0.12,
    rsValue: -1, // denom=0 → Infinity allowed
    beta: 1.2,
    riskFree: 0.03,
    marketReturn: 0.08,
    options: { allowInfinity: true },
}));
console.log('\n=== DCBPRA — allowInfinity:false (guard) ===');
{
    const input = {
        pctAdjust: 0.88,
        baseReturn: 0.06,
        beta: 2.2,
        options: { allowInfinity: false, epsilonGuard: 1e-8, roundStep: 1e-6, debug: true },
    };
    const out = (0, models_1.runDCBPRA)(input);
    console.log(JSON.stringify(out, null, 2));
}
// === Extra edge tests ===
section("FAREX — peg (|idx|>=1.5)");
console.log((0, models_1.runFAREX)({
    lastYearPrevMonthExportShare: 10,
    lastYearThisMonthExportShare: 12,
    thisYearPrevMonthExportShare: 15,
    currentFX: 1300,
}));
section("DDA — T1 clamp");
console.log((0, models_1.runDDA)({
    acquisitionCost: 50000,
    bookValue: 200000,
    residualValue: 1000,
    totalDays: 1825, // 5y
    unusedDays: 0,
    daysUsedThisPeriod: 1,
    baselineUsageHours: 100,
    totalUsageHours: 100,
    usefulLifeYears: 5,
    marketChangeR: 0.3,
    beta: 3,
    triggerUsagePct: 75,
    triggerRevalMultiple: 2,
}));
console.log('\n=== DCBPRA — allowInfinity:true (intentional Infinity) ===');
{
    const input = {
        pctAdjust: "88%",
        baseReturn: "6%",
        beta: 2.2,
        options: { allowInfinity: true, roundStep: 1e-6 },
    };
    const out = (0, models_1.runDCBPRA)(input);
    console.log(JSON.stringify(out, null, 2));
}
