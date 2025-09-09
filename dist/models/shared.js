"use strict";
// =============================
// src/models/shared.ts
// 공통 유틸 + 레거시 alias(_div/_nz/calcSensitivity)
// =============================
Object.defineProperty(exports, "__esModule", { value: true });
exports._nz = exports._div = exports.nz = exports.roundTo = exports.clamp = exports.div = exports.toNumberLoose = void 0;
exports.toFrac = toFrac;
exports.calcSensitivity = calcSensitivity;
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
exports.toNumberLoose = toNumberLoose;
/** "34.5%", "34,500", " 0.345 " → 0~1 분수 */
// shared.ts (or wherever toFrac lives)
function toFrac(v, def = 0) {
    if (v == null)
        return def;
    if (typeof v === "number")
        return Number.isFinite(v) ? v : def;
    if (typeof v === "string") {
        const s = v.trim();
        if (!s)
            return def;
        const hasPct = s.endsWith("%");
        const num = parseFloat(hasPct ? s.slice(0, -1) : s);
        if (!Number.isFinite(num))
            return def;
        return hasPct ? num / 100 : num; // ← 핵심: % 붙으면 100으로 나눠줌
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
}
/** 안전 나눗셈 */
const div = (a, b, d = 0) => {
    const x = Number(a), y = Number(b);
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(y) > 1e-12 ? x / y : d;
};
exports.div = div;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
exports.clamp = clamp;
const roundTo = (x, step = 1e-6) => (step > 0 ? Math.round(x / step) * step : x);
exports.roundTo = roundTo;
const nz = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
exports.nz = nz;
// --- legacy aliases for old imports ---
exports._div = exports.div;
exports._nz = exports.nz;
/** CEEM/RVM에서 쓰던 민감도식(완만형). mode는 시그니처 호환용 */
function calcSensitivity(r, beta, years, _mode = 'decrement') {
    const y = Math.max(1, (0, exports.toNumberLoose)(years, 1));
    return Math.exp(beta * r * (1 + (y - 1) / y));
}
