"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOCIM = runOCIM;
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
/** "25%", "0.25", 25 → 0.25 */
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
function runOCIM(input) {
    const share = toFrac(input?.ociShare); // 0.25
    const r = toFrac(input?.baseRate); // 0.08
    const n = Math.max(0, toNumberLoose(input?.years, 0)); // 음수 방지
    // 표준 공식 고정: (1 + r)^n
    let compounded = Math.pow(1 + r, n);
    let annualIncreasePct = compounded - 1;
    // 트리거: 30% 이상
    const threshold = toNumberLoose(input?.options?.threshold30pct, 0.30);
    const trigger30pct = annualIncreasePct >= threshold;
    // 라운딩(옵션)
    const step = toNumberLoose(input?.options?.roundStep, 1e-6);
    if (step > 0) {
        const rr = (x) => Math.round(x / step) * step;
        compounded = rr(compounded);
        annualIncreasePct = rr(annualIncreasePct);
    }
    const out = {
        principalFactor: share,
        compounded,
        annualIncreasePct,
        trigger30pct
    };
    if (input?.options?.debug) {
        out.debug = { share, rate: r, years: n };
    }
    return out;
}
