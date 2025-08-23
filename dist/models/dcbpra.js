"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDCBPRA = runDCBPRA;
// ---- utils ----
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
/** "88%", "0.88", 88 → 0.88 */
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
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// ---- core ----
function runDCBPRA(input) {
    // 1) 별칭 흡수 + 파싱
    const pctIn = input.pctAdjust ?? input.adjustPercent ?? input.pct ?? 1;
    const baseIn = input.baseReturn ?? input.return ?? 0;
    const betaIn = input.beta ?? 1;
    let pct = clamp(toFrac(pctIn), 0, 1); // 0~1로 클램프
    const baseRet = toFrac(baseIn); // 6% → 0.06
    const beta = toNumberLoose(betaIn, 1);
    const opts = input.options ?? {};
    const eps = toNumberLoose(opts.epsilonGuard, 1e-8);
    const allowInf = !!opts.allowInfinity;
    // 2) 분모 설계: (1 - beta * pct)가 0에 가까우면 폭주 → 가드
    const rawDen = 1 - (beta * pct);
    const denom = Math.abs(rawDen);
    let betaAdjusted;
    if (denom <= eps) {
        betaAdjusted = allowInf ? Infinity : 1 / eps;
    }
    else {
        betaAdjusted = 1 / denom;
    }
    // 3) 최종 수익률
    let adjustedReturn = baseRet * pct * betaAdjusted;
    // 4) 라운딩
    const step = toNumberLoose(opts.roundStep, 1e-6);
    const R = (x) => (step > 0 ? Math.round(x / step) * step : x);
    pct = R(pct);
    betaAdjusted = R(betaAdjusted);
    adjustedReturn = R(adjustedReturn);
    const out = {
        pctAdjust: pct,
        betaAdjusted,
        adjustedReturn
    };
    if (opts.debug)
        out.debug = { baseReturn: baseRet, beta, denom, usedEps: eps };
    return out;
}
