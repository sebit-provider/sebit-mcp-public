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
const session_tracker_1 = require("./session-tracker");
const pdf_generator_1 = require("./pdf-generator");
const logger_1 = require("./logger");
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
    journal: 'journalizing',
};
// 모델 이름 튜플(정적) — z.enum에 그대로 사용
exports.modelNames = [
    'dda', 'lam', 'rvm', 'ceem', 'bdm', 'belm', 'cprm', 'ocim', 'farex', 'tctbeam', 'cpmrv', 'dcbpra', 'journal'
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
    journal: models_1.runJournal,
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
    const startTime = Date.now();
    let success = true;
    let error;
    let cleaned;
    try {
        const raw = registry[model](input ?? {});
        // 1) 1차 클린 (undefined/null/NaN/∞ 제거)
        cleaned = sanitize(raw, sanitizeMode ?? 'omitNullish');
    }
    catch (err) {
        success = false;
        error = err instanceof Error ? err.message : 'Unknown error';
        cleaned = null;
    }
    const executionTime = Date.now() - startTime;
    // 세션 트래커에 실행 기록 저장
    session_tracker_1.sessionTracker.logExecution({
        modelName: model,
        input: input ?? {},
        output: cleaned,
        executionTime,
        success,
        error
    });
    if (!success) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        model,
                        error: error,
                        success: false
                    }, null, 2)
                }]
        };
    }
    // 2) 2차 보증: 직렬화 레벨에서 null/undefined/NaN/∞ 최종 제거
    const safeJson = JSON.stringify({ model, output: cleaned }, (_k, v) => v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v))
        ? undefined
        : v, 2);
    // 3) SDK 호환 타입으로 텍스트 반환
    return { content: [{ type: 'text', text: safeJson }] };
});
// 세션 보고서 생성 툴 추가
server.registerTool('generate_session_report', {
    description: 'Generate a comprehensive analysis report of the current session with insights and PDF output',
    inputSchema: {
        customAnalysis: zod_1.z.string().optional(),
        claudeAnalysis: zod_1.z.string().optional()
    },
}, async ({ customAnalysis, claudeAnalysis }) => {
    try {
        const currentSession = session_tracker_1.sessionTracker.getCurrentSession();
        if (!currentSession || currentSession.executions.length === 0) {
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({
                            error: '현재 세션에 실행된 모델이 없습니다. 모델을 실행한 후 보고서를 생성해주세요.',
                            success: false
                        }, null, 2)
                    }]
            };
        }
        const reportGenerator = new pdf_generator_1.MultiLanguagePDFGenerator();
        // 항상 기본 경로 사용 (savePath 제거)
        const pdfPath = await reportGenerator.generateSessionReport(currentSession, undefined, // 항상 기본 경로
        customAnalysis, claudeAnalysis);
        // 세션 요약 정보
        const summary = {
            sessionId: currentSession.sessionId,
            totalModels: currentSession.executions.length,
            uniqueModels: [...new Set(currentSession.executions.map(e => e.modelName))],
            successRate: (currentSession.executions.filter(e => e.success).length / currentSession.executions.length * 100).toFixed(1),
            reportSavedTo: pdfPath,
            timestamp: new Date().toISOString()
        };
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        message: 'SEBIT MCP 세션 분석 보고서가 성공적으로 생성되었습니다.',
                        summary,
                        success: true
                    }, null, 2)
                }]
        };
    }
    catch (error) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: error instanceof Error ? error.message : 'Unknown error occurred during report generation',
                        success: false
                    }, null, 2)
                }]
        };
    }
});
// 새 세션 시작 툴 추가
server.registerTool('start_new_session', {
    description: 'Start a new tracking session (current session data will be preserved but a new session will begin)',
    inputSchema: {},
}, async () => {
    const newSessionId = session_tracker_1.sessionTracker.startNewSession();
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    message: '새로운 세션이 시작되었습니다.',
                    newSessionId,
                    timestamp: new Date().toISOString(),
                    success: true
                }, null, 2)
            }]
    };
});
// 로그 시스템 초기화
logger_1.Logger.init();
logger_1.Logger.info('SEBIT MCP Server starting...');
const transport = new stdio_js_1.StdioServerTransport();
server.connect(transport).then(() => {
    logger_1.Logger.info('SEBIT MCP Server connected and ready');
}).catch((error) => {
    logger_1.Logger.error('Failed to connect MCP Server', error);
    console.error('MCP CONNECTION ERROR:', error); // 임시 디버깅용
});
