"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBDM = runBDM;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const roundTo = (x, s = 1e-6) => Math.round(x / s) * s;
const nz = (x, d = 0) => (Number.isFinite(+x) ? +x : d);
function runBDM(input) {
    const PV = Math.max(0, nz(input.issueAmount, 0)); // ✅ PV = 발행가액
    const days = Math.max(1, Math.round(nz(input.scheduleDays, 0)));
    const elapsed = Math.max(0, Math.min(days, Math.round(nz(input.elapsedDays, 0))));
    const Vprev = Math.max(1e-9, nz(input.prevMeasuredValue, 0)); // 0 방어
    const n = Math.max(1, Math.round(nz(input.years, 1)));
    const step = input.options?.roundStep ?? 1e-6;
    // 새로 추가된 필드들
    const discountRate = nz(input.discountRate, 0); // 할인율 (선택사항)
    const inputBeta = nz(input.beta, 0); // 베타 계수 (선택사항)
    // Step1: 일일 사용량
    const dailyUsage = PV / days;
    // Step2: 경과일 반영 현재가치 Ps
    let Ps = clamp(PV - dailyUsage * elapsed, 0, PV);
    // 할인율이 제공된 경우 할인 적용
    if (discountRate > 0) {
        Ps = Ps * (1 - discountRate);
    }
    // Step3: 시장가치 계수 β
    const betaRaw = (Ps - Vprev) / Vprev;
    const beta = inputBeta > 0 ? inputBeta : (1 + betaRaw); // 입력된 베타가 있으면 사용, 없으면 계산
    // Step4: 발행가액 기준 시장조정 장부가(1Y)
    const marketAdjustedPV = PV * Math.pow(beta, n);
    // Step5: 이자비용/발행유형 판정 (1Y)
    let issueType = 'par';
    let interestExpense = 0;
    if (marketAdjustedPV < Ps) { // 기대장부가 < 현재가치 → 할인발행(수익 인식 ↑)
        issueType = 'discount';
        interestExpense = Ps - marketAdjustedPV;
    }
    else if (marketAdjustedPV > Ps) { // 기대장부가 > 현재가치 → 할증발행(수익 인식 ↓)
        issueType = 'premium';
        interestExpense = marketAdjustedPV - Ps;
    }
    return {
        dailyUsage: roundTo(dailyUsage, step),
        Ps: roundTo(Ps, step),
        betaRaw: roundTo(betaRaw, step),
        beta: roundTo(beta, step),
        marketAdjustedPV: roundTo(marketAdjustedPV, step),
        interestExpense: roundTo(interestExpense, step),
        issueType,
    };
}
