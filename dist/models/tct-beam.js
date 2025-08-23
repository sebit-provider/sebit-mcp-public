"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTCTBEAM = runTCTBEAM;
// =============================
// FILE: /src/models/tct-beam.ts
// SEBIT-TCT-BEAM: Trigonometric Cost Tracking & Break-Even Analysis
// =============================
const shared_1 = require("./shared");
function toRad(deg) { return (deg * Math.PI) / 180; }
function runTCTBEAM(input) {
    const combinedCost = Math.max(0, input.fixedCostTotal5y + input.variableCostTotal5y);
    const ratioCheck = (0, shared_1._div)(input.variableCostTotal5y, Math.max(1e-9, input.fixedCostTotal5y), 0);
    const baseAngle = (0, shared_1._nz)(input.prevAccumAngle ?? 0);
    const dAngle = (0, shared_1._nz)(input.deltaAngleThisYear ?? 0);
    const newAngle = baseAngle + dAngle;
    // tan(90) 특이점 보호: 89.999/90.001 규칙
    const guardedAngle = Math.abs(newAngle - 90) < 1e-6 ? 90.001 : newAngle;
    const tanValue = Math.tan(toRad(guardedAngle));
    const breakevenReached = newAngle >= 180; // 손익분기점 도달/초과 시점
    // 옵션: 즉시 부호 전환 후 값 제공(표시는 별도)
    const postProcessedTanValue = input.options?.breakevenPostFlip && breakevenReached ? Math.abs(tanValue) : undefined;
    return { combinedCost, ratioCheck, newAngle, tanValue, breakevenReached, postProcessedTanValue };
}
