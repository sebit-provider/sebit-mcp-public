"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelNames = void 0;
// =============================
// FILE: /src/mcp-server.ts
// SEBIT MCP stdio server — list_models, run_model
// - ZodRawShape로 inputSchema 제공
// - 중복 registerTool 가드
// - sanitizeMode('omit'|'null'|'omitNullish') & format('raw'|'pct') 지원
// =============================
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const models_1 = require("./models");
exports.modelNames = [
    'dda', 'lam', 'rvm', 'ceem', 'bdm', 'belm', 'cprm', 'ocim', 'farex', 'tctbeam', 'cpmrv', 'dcbpra'
];
const registry = {
    dda: models_1.runDDA, lam: models_1.runLAM, rvm: models_1.runRVM, ceem: models_1.runCEEM, bdm: models_1.runBDM,
    belm: models_1.runBELM, cprm: models_1.runCPRM, ocim: models_1.runOCIM, farex: models_1.runFAREX, tctbeam: models_1.runTCTBEAM,
    cpmrv: models_1.runCPMRV, dcbpra: models_1.runDCBPRA,
};
function sanitize(v, mode = 'omit') {
    if (v === undefined)
        return mode === 'null' ? null : undefined;
    if (Array.isArray(v)) {
        const arr = v.map(x => sanitize(x, mode));
        return (mode === 'omit' || mode === 'omitNullish') ? arr.filter(x => x !== undefined) : arr;
    }
    if (v && typeof v === 'object') {
        const o = {};
        for (const k of Object.keys(v)) {
            const sv = sanitize(v[k], mode);
            if (!((mode === 'omit' || mode === 'omitNullish') && sv === undefined)) {
                o[k] = sv;
            }
        }
        return o;
    }
    return v;
}
function fmtPercentyKeys(obj, mode = 'raw') {
    if (mode === 'raw' || obj == null || typeof obj !== 'object')
        return obj;
    const percentish = (k) => /(rate|pct|ratio)$/i.test(k) || /^r$/.test(k);
    const walk = (v) => {
        if (Array.isArray(v))
            return v.map(walk);
        if (v && typeof v === 'object') {
            const o = {};
            for (const k of Object.keys(v)) {
                const val = walk(v[k]);
                o[k] = (typeof val === 'number' && percentish(k)) ? `${(val * 100).toFixed(3)}%` : val;
            }
            return o;
        }
        return v;
    };
    return walk(obj);
}
const DEFAULT_SANITIZE = process.env.SANITIZE_MODE ?? 'omitNullish';
// ---------- server ----------
const server = new mcp_js_1.McpServer({ name: 'sebit-mcp', version: '0.1.0' });
// 중복 등록 방지(개발 중 재실행 대비)
const g = globalThis;
if (!g.__SEBIT_MCP_REGISTERED__) {
    g.__SEBIT_MCP_REGISTERED__ = true;
    // list_models
    server.registerTool('list_models', { description: 'List available SEBIT models', inputSchema: {} }, async () => ({
        content: [{ type: 'text', text: JSON.stringify(exports.modelNames) }]
    }));
    // run_model
    server.registerTool('run_model', {
        description: 'Run a SEBIT model by name with a JSON input payload',
        inputSchema: {
            model: zod_1.z.enum(exports.modelNames),
            input: zod_1.z.record(zod_1.z.any()).optional(),
            sanitizeMode: zod_1.z.enum(['omit', 'null', 'omitNullish']).optional(),
            format: zod_1.z.enum(['raw', 'pct']).optional(),
        },
    }, async (args) => {
        if (!args || !args.model || !exports.modelNames.includes(args.model)) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: `unknown model: ${String(args?.model)}` }) }] };
        }
        const raw = registry[args.model](args.input ?? {});
        const cleaned = sanitize(raw, args.sanitizeMode ?? DEFAULT_SANITIZE);
        const out = fmtPercentyKeys(cleaned, args.format ?? 'raw');
        return {
            content: [{ type: 'text', text: JSON.stringify({ model: args.model, output: out }, null, 2) }]
        };
    });
}
const transport = new stdio_js_1.StdioServerTransport();
server.connect(transport).then(() => {
    // eslint-disable-next-line no-console
    console.error('[sebit-mcp] MCP stdio server ready');
});
