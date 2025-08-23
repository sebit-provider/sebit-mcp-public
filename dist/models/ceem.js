"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCEEM = runCEEM;
// ---- utils ----
const n = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
/** "34.5%", "34,500", " 0.345 " 모두 허용 → 0~1 분수 */
const toFrac = (x) => {
    if (x == null)
        return 0;
    if (typeof x === 'string') {
        const cleaned = x.trim().replace(/,/g, '').replace(/%/g, '');
        const v = Number(cleaned);
        if (!Number.isFinite(v))
            return 0;
        return v > 1 ? v / 100 : v;
    }
    const v = Number(x);
    return Number.isFinite(v) ? (v > 1 ? v / 100 : v) : 0;
};
/** 안전 나눗셈 */
const div = (a, b, d = 0) => {
    const x = Number(a), y = Number(b);
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(y) > 1e-12 ? x / y : d;
};
// ---- core ----
function runCEEM(input) {
    const baseline = n(input?.baselineDailyUsage, NaN);
    const actual = n(input?.actualDailyUsage, NaN);
    const expense = n(input?.expenseThisPeriod, 0);
    // 사용량 파트: 값이 비어도 항상 숫자 보장
    const dailyAvgUsage = Number.isFinite(baseline)
        ? baseline
        : (Number.isFinite(actual) ? actual : 0);
    const baselineVsActualUsage = (Number.isFinite(baseline) && baseline > 0 && Number.isFinite(actual))
        ? div(actual, baseline, 1)
        : 1;
    // 민감도 파트
    const yrs = n(input?.usefulLifeYears, 1);
    const beta = n(toFrac(input?.beta), 0); // 문자열/퍼센트 허용
    const r = n(toFrac(input?.marketChangeR), 0); // 문자열/퍼센트 허용
    // 완만한 민감도: 작은 r/beta에서도 소폭 조정되게끔 설계
    // (기존 수치 근사 유지: exp(beta * r * (1 + (yrs-1)/yrs)))
    const sensitivityFactor = Math.exp(beta * r * (1 + (yrs - 1) / Math.max(1, yrs)));
    // 재평가 금액: 당기비용 × 민감도 (사용량 비율은 보고지표로 유지)
    const revaluedExpense = expense * sensitivityFactor;
    const dbg = input?.options?.debug
        ? { baseline: dailyAvgUsage, actual: Number.isFinite(actual) ? actual : 0, yrs, beta }
        : undefined;
    return {
        dailyAvgUsage,
        baselineVsActualUsage,
        expenseThisPeriod: expense,
        r,
        sensitivityFactor,
        revaluedExpense,
        ...(dbg ? { debug: dbg } : {}),
    };
}
