"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFAREX = runFAREX;
// =============================
// FILE: src/models/farex.ts
// =============================
const shared_1 = require("./shared");
const nz = (x, d = 0) => (Number.isFinite(+x) ? +x : d);
// 숫자 또는 기본값(0) — 항상 number 반환
const pickNum = (o, keys, d = 0) => {
    for (const k of keys) {
        const v = o[k];
        if (v !== undefined && Number.isFinite(+v))
            return +v;
    }
    return d;
};
// 숫자 또는 undefined — “입력 존재 여부” 판별용
const pickOpt = (o, keys) => {
    for (const k of keys) {
        const v = o[k];
        if (v !== undefined && Number.isFinite(+v))
            return +v;
    }
    return undefined;
};
function toFrac(x) {
    const n = Number(x); // 안전 변환
    if (!Number.isFinite(n))
        return undefined;
    return n > 1 ? n / 100 : n; // 12.3 → 0.123
}
// 금액으로 비율 계산. “금액이 둘 다 없으면” undefined 반환 → shares 분기로 넘기기 위함
function ratioFromAmounts(exp, imp) {
    if (exp === undefined && imp === undefined)
        return undefined;
    const x = nz(exp, 0), m = nz(imp, 0);
    if (x !== 0)
        return (0, shared_1._div)(x - m, x, 0);
    if (m !== 0)
        return (0, shared_1._div)(x - m, m, 0);
    return 0;
}
// 비중으로 비율 계산(없으면 0)
function ratioFromShares(expShare, impShare) {
    const e = toFrac(expShare);
    const i0 = toFrac(impShare);
    if (e === undefined && i0 === undefined)
        return 0;
    const eVal = e ?? 0;
    if (eVal <= 0)
        return 0;
    const i = i0 === undefined ? Math.max(0, 1 - eVal) : i0;
    return (0, shared_1._div)(eVal - i, eVal, 0);
}
function runFAREX(input) {
    const opt = input.options ?? {};
    const betaClamp = nz(opt.betaClamp, 1.5);
    const wGap = nz(opt.weightTradeGap, 1);
    const betaNegAmplify = nz(opt.betaNegAmplify, 1);
    const betaPosDampen = nz(opt.betaPosDampen, 1);
    // ---- 네 시점: LY-PREV, LY-CURR, TY-PREV, TY-CURR ----
    // 금액 유무를 먼저 판별 → 없으면 shares 사용
    const lyPrevExp = pickOpt(input, ['prevYear_export_prev', 'prevYearPrevMonthExport', 'previousYearPrevMonthExport']);
    const lyPrevImp = pickOpt(input, ['prevYear_import_prev', 'prevYearPrevMonthImport', 'previousYearPrevMonthImport']);
    const ly_prev_r = ratioFromAmounts(lyPrevExp, lyPrevImp) ?? ratioFromShares(pickOpt(input, ['lastYearPrevMonthExportShare']), pickOpt(input, ['lastYearPrevMonthImportShare']));
    const lyCurrExp = pickOpt(input, ['prevYear_export_curr', 'prevYearCurrentMonthExport', 'previousYearThisMonthExport', 'prevYearThisMonthExport']);
    const lyCurrImp = pickOpt(input, ['prevYear_import_curr', 'prevYearCurrentMonthImport', 'previousYearThisMonthImport', 'prevYearThisMonthImport']);
    const ly_curr_r = ratioFromAmounts(lyCurrExp, lyCurrImp) ?? ratioFromShares(pickOpt(input, ['lastYearThisMonthExportShare']), pickOpt(input, ['lastYearThisMonthImportShare']));
    const tyPrevExp = pickOpt(input, ['currYear_export_prev', 'currentYearPrevMonthExport', 'thisYearPrevMonthExport']);
    const tyPrevImp = pickOpt(input, ['currYear_import_prev', 'currentYearPrevMonthImport', 'thisYearPrevMonthImport']);
    const ty_prev_r = ratioFromAmounts(tyPrevExp, tyPrevImp) ?? ratioFromShares(pickOpt(input, ['thisYearPrevMonthExportShare']), pickOpt(input, ['thisYearPrevMonthImportShare']));
    const tyCurrExp = pickOpt(input, ['currYear_export_curr', 'currentYearCurrentMonthExport', 'thisYearThisMonthExport']);
    const tyCurrImp = pickOpt(input, ['currYear_import_curr', 'currentYearCurrentMonthImport', 'thisYearThisMonthImport']);
    const ty_curr_r = ratioFromAmounts(tyCurrExp, tyCurrImp) ?? ratioFromShares(pickOpt(input, ['thisYearThisMonthExportShare']), pickOpt(input, ['thisYearThisMonthImportShare']));
    const prevImbalanceRatio = (nz(ly_prev_r, 0) + nz(ly_curr_r, 0)) / 2;
    const currImbalanceRatio = (nz(ty_prev_r, 0) + nz(ty_curr_r, 0)) / 2;
    // ---- β = ln(|prev| / |curr|) ----
    const eps = 1e-9;
    const a = Math.max(Math.abs(prevImbalanceRatio), eps);
    const b = Math.max(Math.abs(currImbalanceRatio), eps);
    const betaRaw = Math.log(a / b);
    let beta = betaRaw;
    beta = beta >= 0 ? beta * betaPosDampen : beta * betaNegAmplify;
    if (beta > betaClamp)
        beta = betaClamp;
    if (beta < -betaClamp)
        beta = -betaClamp;
    const betaNote = betaRaw >= 0 ? "불균형(전년) 대비 금년 개선 → β≥0" : "불균형 악화 → β<0";
    // ---- 무역갭(전·금년 수출/수입 비율 차) ----
    const prevXR = (0, shared_1._div)((pickNum(input, ['prevYear_export_prev', 'prevYearPrevMonthExport', 'previousYearPrevMonthExport']) +
        pickNum(input, ['prevYear_export_curr', 'prevYearCurrentMonthExport', 'previousYearThisMonthExport', 'prevYearThisMonthExport'])), (pickNum(input, ['prevYear_import_prev', 'prevYearPrevMonthImport', 'previousYearPrevMonthImport']) +
        pickNum(input, ['prevYear_import_curr', 'prevYearCurrentMonthImport', 'previousYearThisMonthImport', 'prevYearThisMonthImport']) || 1), 0);
    const currXR = (0, shared_1._div)((pickNum(input, ['currYear_export_prev', 'currentYearPrevMonthExport', 'thisYearPrevMonthExport']) +
        pickNum(input, ['currYear_export_curr', 'currentYearCurrentMonthExport', 'thisYearThisMonthExport'])), (pickNum(input, ['currYear_import_prev', 'currentYearPrevMonthImport', 'thisYearPrevMonthImport']) +
        pickNum(input, ['currYear_import_curr', 'currentYearCurrentMonthImport', 'thisYearThisMonthImport']) || 1), 0);
    const tradeGapTerm = prevXR - currXR;
    const adjustmentIndex = 1 + beta * (nz(opt.weightTradeGap, 1)) * tradeGapTerm;
    const fxNow = nz(pickNum(input, ['currentFx', 'currentFX', 'currentExchangeRate'], 0), 0);
    const adjustedFxIndicator = (0, shared_1._div)(fxNow, Math.max(adjustmentIndex, eps), fxNow);
    const fxAdjustmentPct = (0, shared_1._div)(adjustedFxIndicator - fxNow, fxNow, 0) * 100;
    return {
        prevImbalanceRatio,
        currImbalanceRatio,
        betaRaw,
        beta,
        betaNote,
        tradeGapTerm,
        adjustmentIndex,
        adjustedFxIndicator,
        fxAdjustmentPct,
    };
}
