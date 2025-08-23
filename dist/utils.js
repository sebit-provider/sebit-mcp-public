"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeLog = safeLog;
exports.safeDivision = safeDivision;
// 공통 유틸
function safeLog(v, eps = 1e-6) {
    return v > 0 ? Math.log(v) : Math.log(Math.abs(v) + eps);
}
function safeDivision(num, den, eps = 1e-9) {
    const d = Math.abs(den) < eps ? (den >= 0 ? eps : -eps) : den;
    return num / d;
}
