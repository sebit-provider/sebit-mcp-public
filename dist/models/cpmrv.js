"use strict";
// =============================
// FILE: src/models/cpmrv.ts
// SEBIT-CPMRV: Cryptocurrency Performance-based Measurement & Real Value
// 문서 Steps 그대로 구현:
// 1) R_prev = ln((1+g_prev)/(1+d_prev))
// 2) RS = (R_prev - ln((1+g_ytd)/(1+d_ytd))) / horizonMonths
// 3) V_current = 1 + 1/(1 + RS)
// 4) cryptoRealValue = currentCryptocurrencyValue * V_current
// ※ 퍼센트 문자열("15%")/숫자 둘 다 입력 허용
// =============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCPMRV = runCPMRV;
const shared_1 = require("./shared");
// 퍼센트/숫자 느슨 파서 ( "15%" → 0.15, "0.15" → 0.15, 15 → 15 )
function toFracLoose(v, def = 0) {
    if (v === null || v === undefined)
        return def;
    if (typeof v === "string") {
        const s = v.trim();
        if (!s)
            return def;
        if (s.endsWith("%")) {
            const n = Number(s.slice(0, -1).replace(/,/g, ""));
            return Number.isFinite(n) ? n / 100 : def;
        }
        const n = Number(s.replace(/,/g, ""));
        return Number.isFinite(n) ? n : def;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
}
function runCPMRV(input) {
    // ---- 입력 정규화
    const g_prev = toFracLoose(input.previousYearGrowthRate, 0);
    const d_prev = toFracLoose(input.previousYearDeclineRate, 0);
    const g_ytd = toFracLoose(input.currentYearGrowthYTD ?? input.currentYearGrowthRate, 0);
    const d_ytd = toFracLoose(input.currentYearDeclineYTD ?? input.currentYearDeclineRate, 0);
    const horizon = Math.max(1, Math.round(input.horizonMonths ?? input.options?.horizonMonths ?? 12));
    const spot = (0, shared_1._nz)(Number(input.currentCryptocurrencyValue) || 0);
    // ---- Step 1: 전년도 평균 실적 산출
    const R_prev = Math.log((1 + g_prev) / (1 + d_prev));
    // ---- Step 2: 전년도 평균 대비 올해 YTD 월할 성장률 분배
    const R_ytd = Math.log((1 + g_ytd) / (1 + d_ytd));
    const RS = (0, shared_1._div)(R_prev - R_ytd, horizon, 0);
    // ---- Step 3: 실질 자산 상대적 리스크 계수
    const V_current = 1 + (0, shared_1._div)(1, (1 + RS), 0);
    // ---- Step 4: 실질 가치
    const cryptoRealValue = spot * V_current;
    const out = { R_prev, RS, V_current, cryptoRealValue };
    if (input.options?.debug) {
        out.debug = {
            inputs: { g_prev, d_prev, g_ytd, d_ytd, horizon, spot },
            R_ytd
        };
    }
    return out;
}
