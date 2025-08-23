"use strict";
// =============================
// FILE: /src/models/cprm.ts
// SEBIT-CPRM: Collateral-adjusted Probabilistic Risk Model (전환사채)
// - 퍼센트/문자열 파싱 강화(%, 콤마, 공백 허용)
// - Claude가 주는 포트폴리오 페이로드 자동 매핑(aliasToCPRM)
// - 트리거: 최종CR>=10%면 분수식 우선, extraAdj<0면 차감식 경로
// - 상한(cap) 정책: caps.maxByStockTrading=true + caps.maxValue 있을 때 cap 적용
// - 디버그 토글(options.debug)
// - 라운딩/클램프 기본 가드(원하면 옵션으로 끌 수 있음)
// =============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCPRM = runCPRM;
// ---------- utils ----------
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
/** "34.5%", "34,500", " 0.345 " 모두 허용 → 0~1 분수로 변환 */
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
/** Claude가 주는 포트폴리오 키셋을 CPRM 핵심 파라미터로 자동 변환 */
function aliasToCPRM(x) {
    const totalAssets = num(x?.totalBondAssets, 0);
    const convAmt = num(x?.convertibleBondAmount, 0);
    const buy = num(x?.buyTransactionAmount, 0);
    const sell = num(x?.sellTransactionAmount, 0);
    const badOcc = num(x?.badDebtOccurred, 0);
    const badProv = num(x?.badDebtProvision, 0);
    const baseCR = totalAssets > 0 ? convAmt / totalAssets : undefined;
    const flow = (buy + sell) > 0 ? (sell - buy) / (buy + sell) : 0;
    const ddAdj = 0.02 * flow; // 2% 밴드 스케일(과도한 영향 방지)
    const extraAdj = totalAssets > 0 ? (badOcc + badProv) / totalAssets : 0;
    return { baseCR, ddAdj, extraAdj };
}
// ---------- core ----------
function runCPRM(input) {
    // 0) alias 매핑으로 비어있는 핵심 파라미터 채우기(원래 키가 있으면 우선)
    const alias = aliasToCPRM(input);
    const baseCR_in = input.baseCR ?? alias.baseCR;
    const ddAdj_in = input.ddAdj ?? alias.ddAdj;
    const extraAdj_in = input.extraAdj ?? alias.extraAdj;
    // 1) 정규화(퍼센트/문자열 허용)
    const baseCR = num(toFrac(baseCR_in), 0);
    const ddAdj = num(toFrac(ddAdj_in), 0);
    const extraAdj = num(toFrac(extraAdj_in), 0);
    // 2) 1차 전환율 (규칙: ddAdj는 /0.24로 환산)
    const adjFactor = ddAdj ? ddAdj / 0.24 : 0; // ex) 0.02 → 0.08333…
    let cr = num(baseCR * (1 - adjFactor), baseCR);
    const afterFirst = cr; // 디버그용 스냅샷
    // 3) 추가 보정률 기본 공제 (문서 step4~7)
    cr = num(cr - extraAdj, cr);
    const triggers = { t10Plus: false, tFrac: false, tSub: false, tCapped: false };
    // 4) 트리거: 최종 전환사채율이 10% 이상이면 추가 보정
    if (cr >= 0.10) {
        triggers.t10Plus = true;
        // 기본은 분수식 cr * (1 - extraAdj)
        // 단, "조정값 결과가 음수" 위험이 있는 경우 차감식 cr - extraAdj 경로
        const fracCandidate = num(cr * (1 - extraAdj), cr);
        const subCandidate = num(cr - extraAdj, cr);
        if (extraAdj >= 0) {
            if (fracCandidate >= 0) {
                cr = fracCandidate;
                triggers.tFrac = true;
            }
            else {
                cr = Math.max(0, subCandidate);
                triggers.tSub = true;
            }
        }
        else {
            if (subCandidate >= 0) {
                cr = subCandidate;
                triggers.tSub = true;
            }
            else {
                cr = Math.max(0, fracCandidate);
                triggers.tFrac = true;
            }
        }
    }
    // 5) 상한(cap): 주식거래액 기준이면 cap에서 고정, 추가 공제 금지
    const capOn = !!input?.caps?.maxByStockTrading;
    const cap = num(input?.caps?.maxValue, NaN);
    if (capOn && Number.isFinite(cap) && cr > cap) {
        cr = cap;
        triggers.tCapped = true;
    }
    // 6) 기본 가드(라운딩/클램프) — 옵션으로 끄거나 조정 가능
    const opts = input?.options ?? {};
    const clampMin = Number.isFinite(opts.clampMinCR) ? opts.clampMinCR : 0;
    const clampMax = Number.isFinite(opts.clampMaxCR) ? opts.clampMaxCR : 1;
    cr = Math.max(clampMin, Math.min(clampMax, cr));
    const step = Number.isFinite(opts.roundStep) ? opts.roundStep : 1e-6;
    if (step > 0)
        cr = Math.round(cr / step) * step; // roundStep=0이면 라운딩 비활성화
    // 7) 디버그 토글
    const debug = opts.debug
        ? { baseCR, ddAdj, adjFactor, afterFirst }
        : undefined;
    return {
        rawConversionRate: baseCR,
        adjFactor,
        finalConversionRate: cr,
        triggers,
        ...(debug ? { debug } : {}),
    };
}
