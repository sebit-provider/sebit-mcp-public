"use strict";
// =============================
// FILE: /src/models/lam.ts
// SEBIT-LAM: Lease Amortization Model
// =============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLAM = runLAM;
// lam.ts
// 안전 나눗셈 & 유한수 보정
const _div2 = (a, b, def = 0) => (b ? a / b : def);
const _finite = (n, def = 0) => (Number.isFinite(n) ? n : def);
function runLAM(input) {
    // 1) 리스기간: 타입에 있는 leaseTermYears 우선, 없으면 leaseTermDays/365 추정
    const leaseYears = input.leaseTermYears ?? _div2(input.leaseTermDays ?? 0, 365, 0);
    const leaseDays = Math.max(1, Math.round(leaseYears * 365));
    // 2) ROU(원가) 후보 키들 중 첫 값 사용
    const rou = _finite(input.rightOfUseAsset ??
        input.rouAsset ??
        input.asset ??
        input.carryingAmountBegin ??
        0, 0);
    // 3) 기본 일할상각액
    const baseDailyAmortization = _div2(rou, leaseDays, 0);
    // 4) 사용패턴 보정: 직접 주면 사용, 아니면 시간비율로 추정
    const totalUsage = Number(input.totalUsageHours ?? 0);
    const baselineUsage = Math.max(1, Number(input.baselineUsageHours ?? 1));
    const usageAdjFactor = _finite(input.usePatternAdj ?? _div2(totalUsage, baselineUsage, 1), 1);
    // 5) 당기 사용일수
    const daysUsed = Math.max(0, Number(input.daysUsedThisPeriod ?? leaseDays));
    // 6) 당기 상각
    const amortizationThisPeriod = _finite(baseDailyAmortization * daysUsed * usageAdjFactor, 0);
    // 7) 상각 후 장부가
    const carryingAmountAfterAmort = _finite(rou - amortizationThisPeriod, 0);
    // 8) 이자 (연이율 가정, 필요한 경우 기간비 반영 가능)
    const rate = Number(input.interestRate ?? input.annualRate ?? 0);
    const interestExpense = _finite(carryingAmountAfterAmort * rate, 0);
    const carryingAmountEnd = _finite(carryingAmountAfterAmort + interestExpense, 0);
    return {
        baseDailyAmortization,
        usageAdjFactor,
        amortizationThisPeriod,
        carryingAmountAfterAmort,
        interestExpense,
        carryingAmountEnd,
        revaluationNote: 'IFRS상 리스자산 재평가모델 미인정: 재평가 차액은 실제 해지 시 해지손익으로 상계 (예측액은 인식하지 않음)',
    };
}
