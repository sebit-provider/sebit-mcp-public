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
        ['ceem', () => (0, models_1.runCEEM)({
                cumulativeUsage: 36500, // 누적 사용량
                cumulativeUsageDays: 365, // 누적 일수
                unitCost: 2.5, // 단가
                periodDays: 30, // 이번 기간 일수
                totalUsage: 3600, // 이번 기간 총 사용량(=120/day*30)
                prevYearR: 0.015, // 전년도 r
                beta: 0.93,
                years: 5,
                options: { debug: true }
            })],
        ['bdm', () => (0, models_1.runBDM)({
                issueAmount: 100000, // PV: 발행가액
                scheduleDays: 365, // 약정일수
                elapsedDays: 90, // 경과일수
                prevMeasuredValue: 82000, // V_{t-1}
                years: 1, // 1년 기준
                options: { roundStep: 1e-6 } // debug 키 없음
            })],
        // === BELM ===
        ['belm', () => (0, models_1.runBELM)({
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
            })],
        ['cprm', () => (0, models_1.runCPRM)({
                baseRate: 0.4,
                ddAdj: -0.0013333333,
                extraAdj: 0.03,
                caps: { maxByStockTrading: false },
                options: { roundStep: 1e-6 } // ✅ debugAudit 제거
            })],
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
            })],
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
