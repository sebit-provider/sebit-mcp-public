"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCPMRV = runCPMRV;
const normalize_1 = require("./normalize");
function runCPMRV(input) {
    const { months, ytdGrowth, risk, baseValue } = (0, normalize_1.normCpmrv)(input);
    const monthlyDistributedGrowth = (0, normalize_1.fin)((0, normalize_1.div2)(ytdGrowth, months, 0), 0);
    const relativeRisk = risk;
    const realValue = (0, normalize_1.fin)(baseValue * Math.pow(1 + monthlyDistributedGrowth, months) * (1 - relativeRisk), 0);
    return { monthlyDistributedGrowth, relativeRisk, realValue };
}
