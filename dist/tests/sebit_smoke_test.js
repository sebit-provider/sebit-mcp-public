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
    acquisitionCost: 100_000,
    bookValue: 80_000,
    residualValue: 5_000,
    totalDays: 1200,
    unusedDays: 100,
    daysUsedThisPeriod: 90,
    baselineUsageHours: 1_000,
    totalUsageHours: 1_200,
    usefulLifeYears: 5,
    marketChangeR: 0.03,
    beta: 1.2,
    triggerUsagePct: 75,
    triggerRevalMultiple: 2
}));
// 2) LAM — amortization + EIR interest
section("LAM");
console.log((0, models_1.runLAM)({
    acquisitionCost: 50_000,
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
    cumulativeMinedValue: 120_000,
    currentPeriodMiningDays: 30,
    currentPeriodMinedValue: 12_000,
    prevYearValuation: 100_000,
    marketChangeR: 0.02,
    beta: 1.1,
    usefulLifeYears: 6
}));
// 4) CEEM — e^{(r*beta)*n(n+1)/2}
section("CEEM");
console.log((0, models_1.runCEEM)({
    cumulativeDays: 365,
    cumulativeUsageQty: 36_500, // 100/day avg
    currentDays: 30,
    currentUsageQty: 3_600, // 120/day
    unitCost: 2.5,
    prevYearExpense: 80_000,
    marketChangeR: 0.015,
    beta: 0.9,
    usefulLifeYears: 2 // exponent sum = 3
}));
// 5) BDM — effective interest one period
section("BDM");
console.log((0, models_1.runBDM)({
    issueAmount: 100000, // PV: 발행가액
    scheduleDays: 365, // 약정일수
    elapsedDays: 90, // 경과일수
    prevMeasuredValue: 82000, // V_{t-1}
    years: 1, // 1년 기준
    options: { roundStep: 1e-6 }
}));
// 6) BELM — fraction rule (<1 add, >1 reduce)
section("BELM");
console.log((0, models_1.runBELM)({
    // Step1~2: 상환 흐름
    dailyExpectedSettlement: 1_000, // 일일 추정 상환액
    usefulLifeYears: 1, // 내용연수(년)
    elapsedDays: 30, // 경과일수
    actualSettlementToDate: 20_000, // 실제 누적 상환액 (예상 30,000 대비 부족)
    // Step4: 이자(연이율)
    interestRate: 0.08, // 8%
    // Step5: 포트폴리오 기여비중
    clientExposure: 200_000, // 해당 거래처 잔액
    totalExposure: 1_000_000, // 전체 거래처 잔액
    // Step6: 전년도 가산 비중(선택)
    prevYearClientSettlement: 50_000, // 전년도 해당 거래처 상환
    prevYearTotalSettlement: 600_000, // 전년도 전체 상환
    // 추가 가감(선택)
    extraAdjPct: 0.01, // +1%p
    clampELR01: true // 최종 대손율 0~1로 클램프 (기본 true)
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
['ocim', () => (0, models_1.runOCIM)({
        // 기존 ociShare를 그대로 쓰고 싶으면 1) 패치 적용 후 사용
        ociShare: "25%",
        openingOCIBalance: 80000,
        currentPeriodOCI: 12000,
        reclassificationAdjustments: 3000,
        marketChangeR: "4%",
        beta: "30%",
        horizonYears: 1,
        // (선택) 분기 중간 조정 슬롯
        quarterAdjRate: "0.5%",
        extraAdjPct: "-0.2%",
        options: { debug: true }
    })];
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
    fixedCostTotal5y: 5_000_000,
    variableCostTotal5y: 6_500_000,
    fixedRatioThisYear: 0.55,
    variableRatioThisYear: 0.45,
    prevAccumAngle: 170,
    deltaAngleThisYear: 15, // crosses 180°
}));
// 11) CPMRV — baseline/YTD average then monthly
section("CPMRV");
console.log((0, models_1.runCPMRV)({
    previousYearGrowthRate: 0.24, // lastYearAvgGrowth
    previousYearDeclineRate: 0.12, // lastYearAvgDrawdown
    currentYearGrowthYTD: 0.18, // ytdGrowth
    currentYearDeclineYTD: 0.10, // ytdDrawdown
    currentCryptocurrencyValue: 1_000_000, // fairValueToday
    horizonMonths: 12, // 선택, 기본 12
    options: { debug: true } // 필요 시
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
    acquisitionCost: 50_000,
    bookValue: 200_000,
    residualValue: 1_000,
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
