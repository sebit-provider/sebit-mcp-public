"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOCIM = runOCIM;
// src/models/ocim.ts (patched to follow the doc)
const shared_1 = require("./shared");
const R = (x, step) => (0, shared_1.roundTo)((0, shared_1._nz)(x), step);
function runOCIM(input) {
    const step = (0, shared_1.toNumberLoose)(input.options?.roundStep, 1e-6);
    const clampOn = (input.options?.clampToCap ?? true);
    // --- Step1: 계정과목 비율 ---
    const shareDirect = (0, shared_1.toFrac)(input.accountSharePct ?? input.ociShare ?? 0);
    const acct = (0, shared_1._nz)(input.accountOCIAmount ?? 0);
    const total = (0, shared_1._nz)(input.totalOCIAllItems ?? 0);
    const shareFromAmounts = total > 0 ? Math.max(0, Math.min(1, acct / total)) : 0;
    const accountShare = shareDirect > 0 ? Math.max(0, Math.min(1, shareDirect)) : shareFromAmounts || 1; // 기본 1
    // --- 잔액/흐름 ---
    const opening = (0, shared_1._nz)(input.openingOCIBalance ?? 0) * accountShare;
    const current = (0, shared_1._nz)(input.currentPeriodOCI ?? 0) * accountShare;
    const reclass = (0, shared_1._nz)(input.reclassificationAdjustments ?? 0) * accountShare;
    // 베이스(재분류 반영)
    const baseOCI = opening + current - reclass;
    // --- Step2: 복리(민감도) ---
    const years = Math.max(1, (0, shared_1.toNumberLoose)(input.horizonYears ?? 1));
    const r = (0, shared_1.toFrac)(input.marketChangeR ?? 0);
    const beta = (0, shared_1.toFrac)(input.beta ?? 0);
    const sensitivityFactor = (0, shared_1.calcSensitivity)(r, beta, years, "increment");
    const compoundedOCI = baseOCI * sensitivityFactor;
    // --- Step3: 분기 중간 측정 조정(선택 슬롯) ---
    const qAdj = (0, shared_1.toFrac)(input.quarterAdjRate ?? 0); // 문서의 전·현 분기 수익/금리식을 외부에서 산정해 입력
    const afterQuarterAdj = compoundedOCI * (1 + qAdj);
    // 추가 보정
    const extra = (0, shared_1.toFrac)(input.extraAdjPct ?? 0);
    let afterExtraAdj = afterQuarterAdj * (1 + extra);
    // 캡
    const minCap = input.minCap === undefined ? undefined : (0, shared_1._nz)(input.minCap);
    const maxCap = input.maxCap === undefined ? undefined : (0, shared_1._nz)(input.maxCap);
    const beforeCap = afterExtraAdj;
    if (clampOn) {
        if (minCap !== undefined)
            afterExtraAdj = Math.max(minCap, afterExtraAdj);
        if (maxCap !== undefined)
            afterExtraAdj = Math.min(maxCap, afterExtraAdj);
    }
    const closing = afterExtraAdj;
    const capped = beforeCap !== closing;
    // --- Step4: 복리 증가분 1년치 비율 ---
    const annualIncreasePct = opening !== 0 ? (closing - opening) / Math.abs(opening) : 0;
    // --- Step5: 트리거(≥30%) ---
    const tAnnual30Up = annualIncreasePct >= 0.30;
    const out = {
        accountShare: R(accountShare, step),
        baseOCI: R(baseOCI, step),
        sensitivityFactor: R(sensitivityFactor, step),
        compoundedOCI: R(compoundedOCI, step),
        afterQuarterAdj: R(afterQuarterAdj, step),
        afterExtraAdj: R(beforeCap, step), // 캡 전 값도 보고 싶으면 유지
        closingOCIBalance: R(closing, step),
        annualIncreasePct: R(annualIncreasePct, step),
        triggers: {
            tAnnual30Up,
            tReclassMove: reclass !== 0,
            tCapped: capped
        }
    };
    if (input.options?.debug) {
        out.debug = {
            inputs: { opening, current, reclass, r, beta, years, qAdj: qAdj, extra, minCap, maxCap },
            notes: {
                step1: "계정과목 비율(직접 또는 account/total)로 베이스 금액 축소",
                step3: "분기 중간 조정은 외부 계산된 quarterAdjRate를 곱해 반영",
                step4: "연간 증가분% = (최종잔액-기초)/|기초|",
                step5: "30% 이상이면 트리거"
            }
        };
    }
    return out;
}
