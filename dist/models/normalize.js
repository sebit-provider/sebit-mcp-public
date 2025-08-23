"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pick = exports.toFrac = exports.fin = exports.div2 = void 0;
exports.share = share;
exports.normFarex = normFarex;
exports.normCpmrv = normCpmrv;
// src/models/normalize.ts
const div2 = (a, b, def = 0) => (b ? a / b : def);
exports.div2 = div2;
const fin = (n, d = 0) => {
    const v = Number(n);
    return Number.isFinite(v) ? v : d;
};
exports.fin = fin;
const toFrac = (x, def = 0) => {
    const v = Number(x);
    if (!Number.isFinite(v))
        return def;
    return v > 1 ? v / 100 : v; // 30 -> 0.30
};
exports.toFrac = toFrac;
const pick = (src, keys) => keys.map(k => src?.[k]).find(v => v !== undefined);
exports.pick = pick;
function share(exp, imp, def = 0) {
    const e = (0, exports.fin)(exp, NaN);
    const i = (0, exports.fin)(imp, NaN);
    const s = (0, exports.div2)(e, e + i, def);
    return Number.isFinite(s) ? s : def;
}
// FAREX: 다양한 키를 표준 스키마로
function normFarex(x) {
    const currentFX = (0, exports.pick)(x, ['currentFX', 'currentExchangeRate']);
    const lastPrevShare = x.lastYearPrevMonthExportShare ??
        share(x.prevYearPrevMonthExport, x.prevYearPrevMonthImport, 0);
    const thisPrevShare = x.thisYearPrevMonthExportShare ??
        share(x.currentYearPrevMonthExport, x.currentYearPrevMonthImport, 0);
    const lastThisShare = x.lastYearThisMonthExportShare ??
        share(x.prevYearCurrentMonthExport, x.prevYearCurrentMonthImport, 1); // 분모로 쓰이니 보수적 1
    return {
        currentFX: (0, exports.fin)(currentFX, 0),
        lastPrevShare: (0, exports.fin)(lastPrevShare, 0),
        thisPrevShare: (0, exports.fin)(thisPrevShare, 0),
        lastThisShare: (0, exports.fin)(lastThisShare, 1),
        options: x.options ?? {},
    };
}
// CPMRV: 퍼센트/키 변형을 표준으로
function normCpmrv(x) {
    const months = (0, exports.fin)((0, exports.pick)(x, ['months']), NaN);
    // 우선순위: 직접 ytdGrowth 제공 → 없으면 (1+g)*(1-d)-1 계산
    const gC = (0, exports.toFrac)(x.currentYearGrowthRate, NaN);
    const dC = (0, exports.toFrac)(x.currentYearDeclineRate, NaN);
    const gP = (0, exports.toFrac)(x.previousYearGrowthRate, NaN);
    const dP = (0, exports.toFrac)(x.previousYearDeclineRate, NaN);
    const ytdFromDirect = (0, exports.fin)(x.ytdGrowth, NaN);
    const ytdFromGC_DC = Number.isFinite(gC) && Number.isFinite(dC) ? (1 + gC) * (1 - dC) - 1 : NaN;
    const ytdGrowth = (0, exports.fin)(Number.isFinite(ytdFromDirect) ? ytdFromDirect : ytdFromGC_DC, 0);
    // risk 없으면 전년 대비 악화분(0~0.5)
    const riskDirect = (0, exports.fin)(x.risk, NaN);
    const netP = Number.isFinite(gP) && Number.isFinite(dP) ? (1 + gP) * (1 - dP) - 1 : NaN;
    const netC = Number.isFinite(gC) && Number.isFinite(dC) ? (1 + gC) * (1 - dC) - 1 : NaN;
    let risk = Number.isFinite(riskDirect) ? riskDirect :
        (Number.isFinite(netP) && Number.isFinite(netC) ? Math.max(0, Math.min(0.5, netP - netC)) : 0);
    risk = Math.min(0.95, Math.max(0, risk)); // 상한
    const baseValue = (0, exports.fin)((0, exports.pick)(x, ['baseValue', 'currentCryptocurrencyValue']), 0);
    return {
        months: Math.max(1, Math.round((0, exports.fin)(months, 12))),
        ytdGrowth,
        risk,
        baseValue,
    };
}
