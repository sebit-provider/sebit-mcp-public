"use strict";
// =============================
// FILE: src/models/lam.ts
// SEBIT-LAM: Lease Amortization Model (robust inputs)
// =============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLAM = runLAM;
// lam.ts
function runLAM(input) {
    // --- helpers ---
    const _div = (a, b, d = 0) => (b ? a / b : d);
    const _finite = (n, d = 0) => (Number.isFinite(n) ? n : d);
    const nz = (x, d = 0) => (Number.isFinite(+x) ? +x : d);
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
    // 0) 파라미터 정리
    const leaseYears = nz(input.leaseTermYears ?? input.leaseTermDays / 365, 1);
    const leaseDays = Math.max(1, Math.round(leaseYears * 365));
    const rou = nz(input.rightOfUseAsset ??
        input.rouAsset ??
        input.asset ??
        input.acquisitionCost ??
        input.carryingAmountBegin, 0);
    const residual = clamp(nz(input.residualValue ?? 0, 0), 0, rou);
    // 사용/일수 기반 가중 (기존 필드 유지)
    const totalDays = nz(input.totalDays, leaseDays);
    const unusedDays = nz(input.unusedDays, 0);
    const daysUsed = Math.max(0, nz(input.daysUsedThisPeriod, totalDays - unusedDays));
    const totalUsage = nz(input.totalUsageHours, 0);
    const baselineUse = Math.max(1, nz(input.baselineUsageHours, 1));
    const usageAdjFactor = _finite(nz(input.usePatternAdj, totalUsage / baselineUse), 1);
    // 1) 기본 일할상각
    const baseDailyAmortization = _div(rou, leaseDays, 0);
    const amortizationThisPeriod = _finite(baseDailyAmortization * daysUsed * usageAdjFactor, 0);
    let carryingAmountAfterAmort = _finite(rou - amortizationThisPeriod, 0);
    carryingAmountAfterAmort = clamp(carryingAmountAfterAmort, residual, rou);
    // 2) 할인(이자) — 첫 기간 취득가 기준 적용 옵션
    const rate = nz(input.discountRate ?? input.interestRate ?? 0, 0);
    const firstPeriodOnAcq = !!input.options?.firstPeriodRateOnAcq; // 기본 false
    const baseForInterest = firstPeriodOnAcq ? rou : carryingAmountAfterAmort;
    const interestExpense = _finite(baseForInterest * rate, 0);
    let carryingAmountEnd = _finite(carryingAmountAfterAmort + interestExpense, 0);
    carryingAmountEnd = clamp(carryingAmountEnd, residual, rou);
    // 3) 시장계수/재평가 ‘제안’(책상 위 계산; 상향은 미인식)
    const r = nz(input.marketChangeR, 0);
    const beta = nz(input.beta, 0);
    // 문서: e^{r×(n−1)}×β 를 간단 적용 (필요시 합성지수식으로 교체 가능)
    const marketCoef = _finite(Math.exp(r * Math.max(0, leaseYears - 1)) * (beta || 1), 1);
    // 사용률 변화(±) – factor→pct
    const usageVar = clamp(usageAdjFactor - 1, -0.99, 10);
    const theoreticalReval = _finite(carryingAmountEnd * (1 + usageVar) * marketCoef, carryingAmountEnd);
    // 4) 트리거(손상만 인식; 상향 불인정)
    const impDeductPct = nz(input.options?.impDeductPct, 0.30); // 30% 공제
    let revaluationNote = 'IFRS상 리스자산 재평가모형 미인정: 증가분은 미인식(계획/내부관리만).';
    if (theoreticalReval < carryingAmountEnd) {
        // 손상 후보
        const delta = carryingAmountEnd - theoreticalReval; // 감소 규모
        const recognizedLoss = _finite(delta * (1 - impDeductPct), 0); // 70% 인식
        carryingAmountEnd = clamp(carryingAmountEnd - recognizedLoss, residual, rou);
        revaluationNote = `손상 인식: 제안가치↓(공제 ${Math.round(impDeductPct * 100)}%) 반영됨.`;
    }
    else {
        // 상향은 미인식
        // carryingAmountEnd 그대로 유지
    }
    return {
        baseDailyAmortization,
        usageAdjFactor,
        amortizationThisPeriod,
        carryingAmountAfterAmort,
        interestExpense,
        carryingAmountEnd,
        revaluationNote,
    };
}
