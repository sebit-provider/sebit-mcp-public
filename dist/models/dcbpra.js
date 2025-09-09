"use strict";
// =============================
// FILE: src/models/dcbpra.ts
// SEBIT-DCBPRA: Dynamic CAPM (Percentage-Adjusted RS)
// - RS는 CPMRV의 RS 그대로 사용 (별칭 허용: RS | rs | rsValue | rPrev)
// - 성장률 보정 I: realGrowthPct(%) 또는 pctAdjust 직접 입력
// - 옵션: allowInfinity / epsilonGuard / roundStep / debug
// =============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDCBPRA = runDCBPRA;
/** 유틸 */
const nz = (x, d = 0) => (Number.isFinite(+x) ? +x : d);
const roundTo = (v, step) => !Number.isFinite(v) ? v : Math.round(v / step) * step;
const toRate = (x, d = 0) => {
    if (Number.isFinite(+x))
        return +x; // 0.06
    if (typeof x === "string") {
        const s = x.trim();
        if (s.endsWith("%")) {
            const n = Number(s.slice(0, -1));
            if (Number.isFinite(n))
                return n / 100; // "6%" -> 0.06
        }
    }
    return d;
};
function runDCBPRA(input) {
    const opt = input.options ?? {};
    const allowInfinity = !!opt.allowInfinity;
    const eps = nz(opt.epsilonGuard, 1e-9);
    const step = nz(opt.roundStep, 1e-6);
    const dbg = !!opt.debug;
    // --- 1) 파라미터 정규화 ---
    const rf = toRate(input.riskFreeRate ?? input.riskFree, 0);
    const rm = toRate(input.marketReturn ?? input.baseReturn, 0);
    const beta = nz(input.beta, 1);
    const RS = nz(input.RS ?? input.rs ?? input.rsValue ?? input.rPrev, 0);
    // --- 2) 성장 보정 I ---
    let I = input.pctAdjust;
    if (!Number.isFinite(I)) {
        const gPct = nz(input.realGrowthPct ?? input.actualGrowthRate, 0);
        const g = gPct / 100; // 퍼센트 → 비율
        I = g >= 0 ? 1 + g : 1 - Math.abs(g);
    }
    I = nz(I, 1);
    // --- 3) β 보정: β_i = β × (1 + 1/(1 + RS)) ---
    let denom = 1 + RS;
    let frac;
    if (denom === 0) {
        if (allowInfinity) {
            frac = Infinity; // ∞ 허용
        }
        else {
            denom = RS >= 0 ? eps : -eps; // 분모 가드
            frac = 1 + 1 / denom;
        }
    }
    else {
        frac = 1 + 1 / denom;
    }
    const betaAdjusted = beta * frac;
    // --- 4) 기대수익/최종수익 ---
    const spread = rm - rf;
    const expectedReturn = !Number.isFinite(betaAdjusted) ? (betaAdjusted > 0 ? Infinity : -Infinity)
        : rf + betaAdjusted * spread;
    const finalReturn = !Number.isFinite(expectedReturn) ? expectedReturn : expectedReturn * I;
    const out = {
        I: roundTo(I, step),
        betaAdjusted: Number.isFinite(betaAdjusted) ? roundTo(betaAdjusted, step) : betaAdjusted,
        expectedReturn: Number.isFinite(expectedReturn) ? roundTo(expectedReturn, step) : expectedReturn,
        finalReturn: Number.isFinite(finalReturn) ? roundTo(finalReturn, step) : finalReturn,
        note: "β_i = β × (1 + 1/(1+RS));  I = (1±g%), g<0이면 1-|g|"
    };
    if (dbg) {
        out.debug = {
            inputs: {
                rf, rm, beta, RS,
                realGrowthPct: input.realGrowthPct ?? input.actualGrowthRate,
                pctAdjust: input.pctAdjust
            },
            options: { allowInfinity, eps, step }
        };
    }
    return out;
}
