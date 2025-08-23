"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFAREX = runFAREX;
const normalize_1 = require("./normalize");
function runFAREX(input) {
    const { currentFX, lastPrevShare, thisPrevShare, lastThisShare, options } = (0, normalize_1.normFarex)(input);
    const exportDeltaIndex = (0, normalize_1.fin)((0, normalize_1.div2)(thisPrevShare - lastPrevShare, Math.max(1e-9, lastThisShare), 0), 0);
    let finalAdjustmentIndex = exportDeltaIndex;
    if (options?.pegHard && Math.abs(finalAdjustmentIndex) >= 1.5) {
        finalAdjustmentIndex = Math.sign(finalAdjustmentIndex) * 1.5;
    }
    const adjustedFX = (0, normalize_1.fin)((0, normalize_1.div2)(currentFX, 1 + finalAdjustmentIndex, currentFX), currentFX);
    return { exportDeltaIndex, finalAdjustmentIndex, adjustedFX };
}
