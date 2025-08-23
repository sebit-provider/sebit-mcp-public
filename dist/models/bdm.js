"use strict";
// =============================
// BDM: Bond Discount/Premium Amortization (유효이자법 1기간)
// - 금액 문자열("1,000") 파싱 수리: comma/underscore/space 제거
// - 퍼센트/문자열 파싱(%, 콤마 허용)
// - 연이율 입력 + periodsPerYear 지원
// =============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBDM = runBDM;
// ---- utils ----
/** 금액/일반 숫자: "1,000" " 980 " "1_234" → 1000/980/1234 */
const toNumberLoose = (x, d = 0) => {
    if (x == null)
        return d;
    if (typeof x === 'string') {
        const cleaned = x.trim().replace(/[,_\s]/g, '');
        const v = Number(cleaned);
        return Number.isFinite(v) ? v : d;
    }
    const v = Number(x);
    return Number.isFinite(v) ? v : d;
};
/** 퍼센트/소수: "2.5%" "0.025" 2.5 → 0.025 */
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
// 연이율 → 기간이율 변환 도우미
const annualToPerPeriod = (annual, periodsPerYear) => {
    const a = toFrac(annual);
    return periodsPerYear > 0 ? a / periodsPerYear : NaN;
};
// 별칭을 표준 키로 정규화
function aliasToBDM(x) {
    const py = toNumberLoose(x.periodsPerYear, NaN);
    const cPerA = annualToPerPeriod(x.couponRateAnnual, py);
    const yPerA = annualToPerPeriod(x.yieldRateAnnual, py);
    const couponAlt = toFrac(x.couponPct);
    const yieldAlt = toFrac(x.yieldPct);
    return {
        carryingAmountStart: toNumberLoose(x.carryingAmountStart, NaN),
        faceValue: toNumberLoose(x.faceValue, NaN),
        couponRatePerPeriod: (Number.isFinite(cPerA) ? cPerA : NaN) ||
            toFrac(x.couponRatePerPeriod) ||
            couponAlt || 0,
        yieldRatePerPeriod: (Number.isFinite(yPerA) ? yPerA : NaN) ||
            toFrac(x.yieldRatePerPeriod) ||
            yieldAlt || 0
    };
}
// ---- core ----
function runBDM(input) {
    const a = aliasToBDM(input);
    const carryingAmountStart = toNumberLoose(a.carryingAmountStart, 0);
    const faceValue = toNumberLoose(a.faceValue, 0);
    const couponRatePerPeriod = toFrac(a.couponRatePerPeriod);
    const yieldRatePerPeriod = toFrac(a.yieldRatePerPeriod);
    const periodCoupon = faceValue * couponRatePerPeriod;
    const periodYieldInterest = carryingAmountStart * yieldRatePerPeriod;
    const amortization = periodYieldInterest - periodCoupon; // 할인(+)/프리미엄(-)
    const endingCarryingAmount = carryingAmountStart + amortization;
    const out = {
        periodCoupon,
        periodYieldInterest,
        amortization,
        endingCarryingAmount,
        isDiscountBond: carryingAmountStart < faceValue
    };
    if (input?.options?.debug) {
        out.debug = { carryingAmountStart, faceValue, couponRatePerPeriod, yieldRatePerPeriod };
    }
    const step = toNumberLoose(input?.options?.roundStep, 1e-6);
    if (step > 0) {
        const r = (x) => Math.round(x / step) * step;
        out.periodCoupon = r(out.periodCoupon);
        out.periodYieldInterest = r(out.periodYieldInterest);
        out.amortization = r(out.amortization);
        out.endingCarryingAmount = r(out.endingCarryingAmount);
    }
    return out;
}
