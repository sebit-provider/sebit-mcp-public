"use strict";
// FILE: src/mcp-http.ts (GPT Connector 전용 + OPTIONS + zod validation)
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelNames = void 0;
const http_1 = require("http");
const zod_1 = require("zod");
const logger_1 = require("./logger");
// ====== 모델 실행기 ======
const models_1 = require("./models");
// ---------- 모델 레지스트리 ----------
exports.modelNames = [
    "dda", "lam", "rvm", "ceem", "bdm", "belm", "cprm", "ocim", "farex", "tctbeam", "cpmrv", "dcbpra", "journal"
];
const registry = {
    dda: models_1.runDDA, lam: models_1.runLAM, rvm: models_1.runRVM, ceem: models_1.runCEEM, bdm: models_1.runBDM,
    belm: models_1.runBELM, cprm: models_1.runCPRM, ocim: models_1.runOCIM, farex: models_1.runFAREX,
    tctbeam: models_1.runTCTBEAM, cpmrv: models_1.runCPMRV, dcbpra: models_1.runDCBPRA, journal: models_1.runJournal,
};
// ---------- zod schema ----------
const runModelSchema = zod_1.z.object({
    model: zod_1.z.enum(exports.modelNames),
    input: zod_1.z.record(zod_1.z.any()).optional(),
});
// ---------- HTTP 서버 ----------
async function main() {
    const port = Number(process.env.PORT) || 3333;
    const httpServer = (0, http_1.createServer)(async (req, res) => {
        const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
        // 공통 헤더
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        // Preflight (CORS)
        if (req.method === "OPTIONS") {
            res.writeHead(204, {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            });
            res.end();
            return;
        }
        // health
        if (url.pathname === "/health") {
            res.writeHead(200);
            res.end(JSON.stringify({ status: "ok", models: [...exports.modelNames], ts: new Date().toISOString() }));
            return;
        }
        // 모델 목록
        if (url.pathname === "/mcp/models" && req.method === "GET") {
            res.writeHead(200);
            res.end(JSON.stringify(exports.modelNames));
            return;
        }
        if (url.pathname === "/mcp" && req.method === "GET") {
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({
                ok: true,
                message: "MCP endpoint ready",
                models: exports.modelNames
            }));
            return;
        }
        // 모델 실행
        if (url.pathname === "/mcp/run-model" && req.method === "POST") {
            let body = "";
            req.on("data", chunk => body += chunk);
            req.on("end", () => {
                try {
                    const parsed = runModelSchema.parse(JSON.parse(body));
                    const { model, input } = parsed;
                    const output = registry[model](input || {});
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, output }));
                }
                catch (err) {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        error: err instanceof Error ? err.message : "Invalid request"
                    }));
                }
            });
            return;
        }
        if (url.pathname === "/.well-known/mcp.json") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                name: "SEBIT-MCP",
                version: "1.0.0",
                endpoints: {
                    health: "/health",
                    models: "/mcp/models",
                    run_model: "/mcp/run-model"
                },
                capabilities: {
                    tools: true
                }
            }));
            return;
        }
        // not found
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Not Found" }));
    });
    httpServer.listen(port, () => {
        logger_1.Logger.info(`GPT Connector MCP Server running at http://localhost:${port}`);
    });
}
main().catch(err => {
    logger_1.Logger.error("Fatal error in HTTP server", err);
    process.exit(1);
});
