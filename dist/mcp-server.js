"use strict";
// =============================
// FILE: /src/mcp-server.ts
// Minimal MCP server (stdio) exposing tools: list_models, run_model
// Uses new MCP TS SDK: McpServer + registerTool (expects ZodRawShape for inputSchema)
// =============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelNames = void 0;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const models_1 = require("./models");
const labels = {
    dda: 'Dynamic Depreciation',
    lam: 'Lease Asset Model',
    rvm: 'Resource Valuation',
    ceem: 'Consumable Expense Model',
    bdm: 'Bond Effective Interest',
    belm: 'Expected Loss',
    cprm: 'Convertible Bond Risk',
    ocim: 'OCI Compounded Increase',
    farex: 'FX Adjustment',
    tctbeam: 'Trigonometric Breakeven',
    cpmrv: 'Crypto Real Value',
    dcbpra: 'Beta-Adjusted Return',
};
// 모델 이름 튜플(정적) — z.enum에 그대로 사용
exports.modelNames = [
    'dda', 'lam', 'rvm', 'ceem', 'bdm', 'belm', 'cprm', 'ocim', 'farex', 'tctbeam', 'cpmrv', 'dcbpra'
];
// 레지스트리
const registry = {
    dda: models_1.runDDA,
    lam: models_1.runLAM,
    rvm: models_1.runRVM,
    ceem: models_1.runCEEM,
    bdm: models_1.runBDM,
    belm: models_1.runBELM,
    cprm: models_1.runCPRM,
    ocim: models_1.runOCIM,
    farex: models_1.runFAREX,
    tctbeam: models_1.runTCTBEAM,
    cpmrv: models_1.runCPMRV,
    dcbpra: models_1.runDCBPRA,
};
const server = new mcp_js_1.McpServer({ name: 'sebit-mcp', version: '0.1.0' });
function sanitize(v, mode = 'omitNullish', seen = new WeakSet()) {
    const dropUndef = mode === 'omit' || mode === 'omitNullish';
    const dropNull = mode === 'omitNullish';
    if (typeof v === 'number') {
        if (!Number.isFinite(v))
            return dropUndef ? undefined : null; // NaN/∞ 제거
        return v;
    }
    if (v === undefined)
        return dropUndef ? undefined : null;
    if (v === null)
        return dropNull ? undefined : null;
    if (v && typeof v === 'object') {
        if (seen.has(v))
            return undefined;
        seen.add(v);
        if (Array.isArray(v)) {
            const arr = v.map(x => sanitize(x, mode, seen));
            seen.delete(v);
            return (dropUndef || dropNull) ? arr.filter(x => x !== undefined) : arr;
        }
        const o = {};
        for (const k of Object.keys(v)) {
            const sv = sanitize(v[k], mode, seen);
            if (!((dropUndef || dropNull) && sv === undefined))
                o[k] = sv;
        }
        seen.delete(v);
        return o;
    }
    return v;
}
server.registerTool('run_model', {
    description: 'Run a SEBIT model by name with a JSON input payload',
    inputSchema: {
        model: zod_1.z.enum(exports.modelNames),
        input: zod_1.z.record(zod_1.z.any()).optional(),
        sanitizeMode: zod_1.z.enum(['omit', 'null', 'omitNullish']).optional()
    },
}, async ({ model, input, sanitizeMode }) => {
    const raw = registry[model](input ?? {});
    // 1) 1차 클린 (undefined/null/NaN/∞ 제거)
    const cleaned = sanitize(raw, sanitizeMode ?? 'omitNullish');
    // 2) 2차 보증: 직렬화 레벨에서 null/undefined/NaN/∞ 최종 제거
    const safeJson = JSON.stringify({ model, output: cleaned }, (_k, v) => v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v))
        ? undefined
        : v, 2);
    // 3) SDK 호환 타입으로 텍스트 반환
    return { content: [{ type: 'text', text: safeJson }] };
});
const transport = new stdio_js_1.StdioServerTransport();
server.connect(transport).then(() => {
    // eslint-disable-next-line no-console
    console.error('[sebit-mcp] MCP stdio server ready');
});
