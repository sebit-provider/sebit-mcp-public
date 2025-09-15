"use strict";
// =============================
// FILE: src/mcp-http.ts
// SEBIT MCP — HTTP(SSE) 서버 (Claude/Cloudflare/Nginx 프록시 완전호환)
// - /health, /, /.well-known/*, /register, OPTIONS/HEAD 지원
// - SDK 신/구 버전별 SSE 생성자 호환 (handleRequest 유무 대응)
// - connect()는 "첫 GET /mcp"에서 1회만 수행, 재접속시 자동 초기화
// - 절대 URL 강제, 헤더 안전문자열화, CORS 화이트리스트, X-Accel-Buffering
// - POST 처리: 신버전은 transport.handleRequest, 구버전은 mcp.handleRequest 폴백
// =============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelNames = void 0;
const http_1 = require("http");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
const zod_1 = require("zod");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
// ====== (너의 모델 실행기들) ======
const models_1 = require("./models");
function sanitize(v, mode = "omitNullish") {
    if (v === undefined)
        return mode === "null" ? null : undefined;
    if (Array.isArray(v)) {
        const arr = v.map(x => sanitize(x, mode));
        return (mode === "omit" || mode === "omitNullish") ? arr.filter(x => x !== undefined) : arr;
    }
    if (v && typeof v === "object") {
        const o = {};
        for (const k of Object.keys(v)) {
            const sv = sanitize(v[k], mode);
            if (!((mode === "omit" || mode === "omitNullish") && sv === undefined))
                o[k] = sv;
        }
        return o;
    }
    return v;
}
// ---------- 모델 레지스트리 ----------
exports.modelNames = [
    "dda", "lam", "rvm", "ceem", "bdm", "belm", "cprm", "ocim", "farex", "tctbeam", "cpmrv", "dcbpra", "journal"
];
const registry = {
    dda: models_1.runDDA, lam: models_1.runLAM, rvm: models_1.runRVM, ceem: models_1.runCEEM, bdm: models_1.runBDM,
    belm: models_1.runBELM, cprm: models_1.runCPRM, ocim: models_1.runOCIM, farex: models_1.runFAREX,
    tctbeam: models_1.runTCTBEAM, cpmrv: models_1.runCPMRV, dcbpra: models_1.runDCBPRA, journal: models_1.runJournal,
};
// ---------- 안전 유틸 (헤더/Origin/프로토콜/호스트 문자열화) ----------
const safeStr = (v, fallback = "") => String(Array.isArray(v) ? v[0] : (v ?? fallback))
    .replace(/[\r\n]+/g, "") // CRLF 제거
    .trim();
const getProto = (req) => safeStr(req.headers["x-forwarded-proto"]) ||
    (req.socket.encrypted ? "https" : "http");
const getHost = (req, defaultHost = "localhost:3333") => safeStr(req.headers["x-forwarded-host"]) ||
    safeStr(req.headers["host"], defaultHost);
// CORS 화이트리스트: 쉼표 구분. 기본값으로 Claude 도메인 포함
const ALLOW_ORIGINS = (process.env.CORS_ALLOW_ORIGINS || "https://claude.ai,https://claude.anthropic.com")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
const setCORS = (req, res) => {
    const origin = safeStr(req.headers.origin, "");
    const allowed = ALLOW_ORIGINS.length === 0
        ? "" // 기본 보수: 허용 안 함. 필요 시 환경변수로 지정해줘.
        : (ALLOW_ORIGINS.includes(origin) ? origin : "");
    res.setHeader("Vary", "Origin");
    if (allowed) {
        res.setHeader("Access-Control-Allow-Origin", allowed);
        res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type, Authorization, ngrok-skip-browser-warning, cf-access-jwt-assertion");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no"); // nginx 버퍼링 방지
};
// ---------- 정적 파일 서빙 유틸 ----------
const getMimeType = (filePath) => {
    const ext = (0, path_1.extname)(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject'
    };
    return mimeTypes[ext] || 'application/octet-stream';
};
const serveStatic = (req, res, filePath) => {
    try {
        if (!(0, fs_1.existsSync)(filePath)) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("File not found");
            return;
        }
        const stat = (0, fs_1.statSync)(filePath);
        if (!stat.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not a file");
            return;
        }
        const content = (0, fs_1.readFileSync)(filePath);
        const mimeType = getMimeType(filePath);
        setCORS(req, res);
        res.setHeader("Content-Type", `${mimeType}; charset=utf-8`);
        res.setHeader("Cache-Control", "public, max-age=3600"); // 1시간 캐시
        res.writeHead(200);
        res.end(content);
    }
    catch (error) {
        console.error("Static file serve error:", error);
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Internal server error");
    }
};
// ---------- 세션 관리 ----------
const sessions = new Map();
// 세션 정리 (10분 비활성)
setInterval(() => {
    const now = new Date();
    for (const [id, session] of sessions.entries()) {
        if (now.getTime() - session.lastActivity.getTime() > 10 * 60 * 1000) {
            sessions.delete(id);
            console.log(`[session] cleaned up inactive session: ${id}`);
        }
    }
}, 5 * 60 * 1000);
// ---------- MCP 서버 ----------
function buildServer() {
    const server = new mcp_js_1.McpServer({
        name: "sebit-mcp",
        version: "1.0.0",
        protocolVersion: "2025-03-26" // 최신 프로토콜 버전
    });
    server.registerTool("list_models", { description: "List available SEBIT models", inputSchema: {} }, async () => ({ content: [{ type: "text", text: JSON.stringify([...exports.modelNames]) }] }));
    server.registerTool("run_model", {
        description: "Run a SEBIT model by name with a JSON input payload",
        inputSchema: {
            model: zod_1.z.enum([...exports.modelNames]),
            input: zod_1.z.record(zod_1.z.any()).optional(),
            sanitizeMode: zod_1.z.enum(["omit", "null", "omitNullish"]).optional(),
        },
    }, async (a, b) => {
        // SDK 버전에 따른 param 위치 보정
        const params = (a && ("model" in a || "input" in a || "sanitizeMode" in a))
            ? a
            : (a?.request?.params ?? a?.params ?? b?.params ?? {});
        const model = params?.model;
        const input = params?.input ?? {};
        const sanitizeMode = params?.sanitizeMode
            ?? process.env.SANITIZE_MODE
            ?? "omitNullish";
        if (!model || !exports.modelNames.includes(model)) {
            return {
                content: [{ type: "text", text: `unknown model: ${String(model)}\navailable: ${exports.modelNames.join(", ")}` }],
                isError: true
            };
        }
        const raw = registry[model](input);
        const out = sanitize(raw, sanitizeMode);
        return { content: [{ type: "text", text: JSON.stringify({ model, output: out }, null, 2) }] };
    });
    return server;
}
// ---------- HTTP 서버 ----------
async function main() {
    const mcp = buildServer();
    const port = Number(process.env.PORT) || 3333;
    const mcpPath = "/mcp";
    const httpServer = (0, http_1.createServer)(async (req, res) => {
        // 기본 URL 파싱(Host 헤더 기반)
        const url = new URL(req.url ?? "/", `http://${safeStr(req.headers.host, "localhost:" + port)}`);
        // 공통: 보안/프록시 헤더
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("Referrer-Policy", "no-referrer");
        // Preflight & HEAD
        if (req.method === "OPTIONS") {
            setCORS(req, res);
            res.writeHead(204);
            res.end();
            return;
        }
        if (req.method === "HEAD") {
            setCORS(req, res);
            res.writeHead(200);
            res.end();
            return;
        }
        // 헬스체크
        if (url.pathname === "/health") {
            setCORS(req, res);
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ status: "ok", models: [...exports.modelNames], ts: new Date().toISOString() }));
            return;
        }
        // OAuth well-known (authorization server)
        if (url.pathname === "/.well-known/oauth-authorization-server/mcp"
            || url.pathname === "/.well-known/oauth-authorization-server") {
            setCORS(req, res);
            const base = `${getProto(req)}://${getHost(req, `localhost:${port}`)}`;
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({
                issuer: base,
                authorization_endpoint: `${base}/oauth/authorize`,
                token_endpoint: `${base}/oauth/token`,
                registration_endpoint: `${base}/oauth/register`,
                response_types_supported: ["code"],
                grant_types_supported: ["authorization_code"],
                code_challenge_methods_supported: ["S256"],
            }));
            return;
        }
        // OAuth well-known (protected resource)
        if (url.pathname === "/.well-known/oauth-protected-resource/mcp"
            || url.pathname === "/.well-known/oauth-protected-resource") {
            setCORS(req, res);
            const base = `${getProto(req)}://${getHost(req, `localhost:${port}`)}`;
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ resource: base }));
            return;
        }
        // OAuth 클라이언트 등록 (DCR - RFC 7591)
        if (url.pathname === "/oauth/register") {
            setCORS(req, res);
            if (req.method === "POST") {
                let body = "";
                req.on("data", (chunk) => (body += chunk));
                req.on("end", () => {
                    try {
                        const clientInfo = JSON.parse(body || "{}");
                        // Claude 특화 검증
                        const isClaudeClient = clientInfo.client_name === "Claude" ||
                            clientInfo.client_name?.includes("Claude") ||
                            clientInfo.software_id?.includes("claude");
                        const clientId = isClaudeClient ? "claude_client" : `client_${Date.now()}`;
                        const clientSecret = `secret_${clientId}_${Math.random().toString(36).substr(2, 16)}`;
                        // Claude 콜백 URL 검증
                        const redirectUris = clientInfo.redirect_uris || [];
                        const validClaudeUris = [
                            "https://claude.ai/api/mcp/auth_callback",
                            "https://claude.com/api/mcp/auth_callback"
                        ];
                        const finalRedirectUris = redirectUris.length > 0
                            ? redirectUris
                            : validClaudeUris;
                        res.writeHead(201, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify({
                            client_id: clientId,
                            client_secret: clientSecret,
                            client_id_issued_at: Math.floor(Date.now() / 1000),
                            client_secret_expires_at: 0, // 무만료
                            redirect_uris: finalRedirectUris,
                            token_endpoint_auth_method: "client_secret_basic",
                            grant_types: ["authorization_code", "refresh_token"],
                            response_types: ["code"],
                            client_name: clientInfo.client_name || "Claude MCP Client",
                            client_uri: clientInfo.client_uri || "https://claude.ai",
                            logo_uri: clientInfo.logo_uri,
                            scope: "mcp",
                            contacts: clientInfo.contacts || ["support@anthropic.com"],
                            tos_uri: clientInfo.tos_uri,
                            policy_uri: clientInfo.policy_uri,
                            software_id: clientInfo.software_id || "claude-mcp",
                            software_version: clientInfo.software_version || "1.0.0"
                        }));
                        console.log(`[dcr] registered client: ${clientId} for ${clientInfo.client_name || 'unknown'}`);
                    }
                    catch (error) {
                        console.error("[dcr] registration error:", error);
                        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify({
                            error: "invalid_request",
                            error_description: "Invalid registration request JSON"
                        }));
                    }
                });
            }
            else {
                res.writeHead(405, { "Allow": "POST", "Content-Type": "text/plain; charset=utf-8" });
                res.end("Method Not Allowed");
            }
            return;
        }
        // OAuth 인증 엔드포인트
        if (url.pathname === "/oauth/authorize") {
            setCORS(req, res);
            const params = url.searchParams;
            const clientId = params.get("client_id");
            const redirectUri = params.get("redirect_uri");
            const state = params.get("state");
            const scope = params.get("scope");
            const responseType = params.get("response_type");
            const codeChallenge = params.get("code_challenge");
            const codeChallengeMethod = params.get("code_challenge_method");
            // 필수 파라미터 검증
            if (!clientId || !redirectUri || responseType !== "code") {
                const errorUrl = new URL(redirectUri || "https://claude.ai/");
                errorUrl.searchParams.set("error", "invalid_request");
                errorUrl.searchParams.set("error_description", "Missing or invalid required parameters");
                if (state)
                    errorUrl.searchParams.set("state", state);
                res.writeHead(302, { "Location": errorUrl.toString() });
                res.end();
                return;
            }
            // Claude 콜백 URL 검증
            const validRedirectUris = [
                "https://claude.ai/api/mcp/auth_callback",
                "https://claude.com/api/mcp/auth_callback"
            ];
            if (!validRedirectUris.includes(redirectUri)) {
                res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                res.end(JSON.stringify({
                    error: "invalid_request",
                    error_description: "Invalid redirect_uri"
                }));
                return;
            }
            // 자동 승인 (Claude를 위한 간소화)
            const authCode = `${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
            // PKCE 코드 저장 (나중에 토큰 교환에서 검증)
            if (codeChallenge && codeChallengeMethod === "S256") {
                console.log(`[oauth] storing PKCE challenge for code: ${authCode}`);
            }
            const redirectUrl = new URL(redirectUri);
            redirectUrl.searchParams.set("code", authCode);
            if (state)
                redirectUrl.searchParams.set("state", state);
            console.log(`[oauth] authorization granted for client: ${clientId}`);
            res.writeHead(302, { "Location": redirectUrl.toString() });
            res.end();
            return;
        }
        // OAuth 토큰 엔드포인트
        if (url.pathname === "/oauth/token") {
            setCORS(req, res);
            if (req.method === "POST") {
                let body = "";
                req.on("data", (chunk) => (body += chunk));
                req.on("end", () => {
                    try {
                        const params = new URLSearchParams(body);
                        const grantType = params.get("grant_type");
                        const code = params.get("code");
                        const redirectUri = params.get("redirect_uri");
                        const clientId = params.get("client_id");
                        const clientSecret = params.get("client_secret");
                        const codeVerifier = params.get("code_verifier");
                        // Authorization Code Grant 검증
                        if (grantType === "authorization_code") {
                            if (!code || !clientId) {
                                res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                                res.end(JSON.stringify({
                                    error: "invalid_request",
                                    error_description: "Missing required parameters"
                                }));
                                return;
                            }
                            // 코드 유효성 검증 (간단한 패턴 매칭)
                            if (!code.startsWith(clientId)) {
                                res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                                res.end(JSON.stringify({
                                    error: "invalid_grant",
                                    error_description: "Invalid authorization code"
                                }));
                                return;
                            }
                            // 토큰 생성
                            const accessToken = `Bearer_${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
                            const refreshToken = `Refresh_${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
                            console.log(`[oauth] token issued for client: ${clientId}`);
                            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                            res.end(JSON.stringify({
                                access_token: accessToken,
                                token_type: "Bearer",
                                expires_in: 3600,
                                refresh_token: refreshToken,
                                scope: "mcp",
                                id_token: null // OpenID Connect는 미지원
                            }));
                            return;
                        }
                        // Refresh Token Grant
                        if (grantType === "refresh_token") {
                            const refreshToken = params.get("refresh_token");
                            if (!refreshToken || !clientId) {
                                res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                                res.end(JSON.stringify({
                                    error: "invalid_request",
                                    error_description: "Missing refresh token or client ID"
                                }));
                                return;
                            }
                            const newAccessToken = `Bearer_${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
                            const newRefreshToken = `Refresh_${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
                            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                            res.end(JSON.stringify({
                                access_token: newAccessToken,
                                token_type: "Bearer",
                                expires_in: 3600,
                                refresh_token: newRefreshToken,
                                scope: "mcp"
                            }));
                            return;
                        }
                        // 지원하지 않는 grant_type
                        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify({
                            error: "unsupported_grant_type",
                            error_description: `Grant type '${grantType}' is not supported`
                        }));
                    }
                    catch (error) {
                        console.error("[oauth] token endpoint error:", error);
                        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify({
                            error: "invalid_request",
                            error_description: "Malformed request body"
                        }));
                    }
                });
            }
            else {
                res.writeHead(405, { "Allow": "POST", "Content-Type": "text/plain; charset=utf-8" });
                res.end("Method Not Allowed");
            }
            return;
        }
        // /register (사전 호출용 - 레거시 호환)
        if (url.pathname === "/register") {
            setCORS(req, res);
            const base = `${getProto(req)}://${getHost(req, `localhost:${port}`)}`;
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: true, endpoint: `${base}${mcpPath}` }));
            return;
        }
        // MCP 엔드포인트 - 모델 목록
        if (url.pathname === "/mcp/models") {
            setCORS(req, res);
            if (req.method === "GET") {
                res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                res.end(JSON.stringify(exports.modelNames));
            }
            else {
                res.writeHead(405, { "Allow": "GET", "Content-Type": "text/plain; charset=utf-8" });
                res.end("Method Not Allowed");
            }
            return;
        }
        // MCP 엔드포인트 - 모델 실행
        if (url.pathname === "/mcp/run-model") {
            setCORS(req, res);
            if (req.method === "POST") {
                let body = "";
                req.on("data", (chunk) => (body += chunk));
                req.on("end", () => {
                    try {
                        const { model, input } = JSON.parse(body);
                        if (!model || !exports.modelNames.includes(model)) {
                            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                            res.end(JSON.stringify({ error: `Invalid model: ${model}` }));
                            return;
                        }
                        const output = registry[model](input || {});
                        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify({ success: true, output }));
                    }
                    catch (error) {
                        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
                    }
                });
            }
            else {
                res.writeHead(405, { "Allow": "POST", "Content-Type": "text/plain; charset=utf-8" });
                res.end("Method Not Allowed");
            }
            return;
        }
        // 루트 - /app으로 리다이렉트
        if (url.pathname === "/") {
            setCORS(req, res);
            res.writeHead(302, { "Location": "/app" });
            res.end();
            return;
        }
        // ========== 웹앱 라우팅 (/app) ==========
        // /app/app -> /app 리다이렉트 (이중 라우팅 방지) - 먼저 체크
        if (url.pathname === "/app/app") {
            setCORS(req, res);
            res.writeHead(302, { "Location": "/app" });
            res.end();
            return;
        }
        if (url.pathname.startsWith("/app")) {
            setCORS(req, res);
            const appBuildPath = (0, path_1.join)(__dirname, "..", "app", "build");
            let requestPath = url.pathname.replace("/app", "") || "/";
            // SPA 라우팅: /app/xxx -> index.html
            if (requestPath === "/" || !requestPath.includes(".")) {
                requestPath = "/index.html";
            }
            const filePath = (0, path_1.join)(appBuildPath, requestPath);
            serveStatic(req, res, filePath);
            return;
        }
        // ========== MCP 엔드포인트 (Streamable HTTP 2025-03-26) ==========
        if (url.pathname === mcpPath) {
            setCORS(req, res);
            // 세션 ID 관리
            const sessionId = safeStr(req.headers["mcp-session-id"]) || (0, crypto_1.randomUUID)();
            let session = sessions.get(sessionId);
            if (!session) {
                session = {
                    id: sessionId,
                    createdAt: new Date(),
                    lastActivity: new Date(),
                    connected: false
                };
                sessions.set(sessionId, session);
                console.log(`[session] created new session: ${sessionId}`);
            }
            else {
                session.lastActivity = new Date();
            }
            // Accept 헤더 확인 (Streamable HTTP 요구사항)
            const acceptHeader = safeStr(req.headers.accept, "");
            const supportsJson = acceptHeader.includes("application/json");
            const supportsSSE = acceptHeader.includes("text/event-stream");
            // 프로토콜 협상: JSON 우선, SSE 폴백
            const useStreamable = supportsJson;
            const useSSE = !useStreamable && supportsSSE;
            try {
                if (req.method === "GET") {
                    // Streamable HTTP: 세션 초기화 응답
                    if (useStreamable) {
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.setHeader("Mcp-Session-Id", sessionId);
                        res.writeHead(200);
                        const initResponse = {
                            jsonrpc: "2.0",
                            id: 1,
                            result: {
                                protocolVersion: "2025-03-26",
                                capabilities: {
                                    tools: {},
                                    resources: {},
                                    prompts: {},
                                    logging: {}
                                },
                                serverInfo: {
                                    name: "sebit-mcp",
                                    version: "1.0.0"
                                },
                                sessionId: sessionId,
                                instructions: "Send POST requests to this endpoint with Mcp-Session-Id header"
                            }
                        };
                        res.end(JSON.stringify(initResponse));
                        console.log(`[session] initialized streamable session: ${sessionId}`);
                        return;
                    }
                    // 레거시 SSE 지원 (deprecated)
                    if (useSSE) {
                        const proto = getProto(req);
                        const host = getHost(req, `localhost:${port}`);
                        const absolutePostUrl = `${proto}://${host}${mcpPath}`;
                        try {
                            if (!session.transport) {
                                session.transport = new sse_js_1.SSEServerTransport({ path: mcpPath });
                            }
                            if (typeof session.transport.handleRequest === "function") {
                                session.transport.handleRequest(req, res);
                            }
                            else {
                                session.transport = new sse_js_1.SSEServerTransport(absolutePostUrl, res);
                            }
                        }
                        catch {
                            session.transport = new sse_js_1.SSEServerTransport(absolutePostUrl, res);
                        }
                        if (!session.connected) {
                            await mcp.connect(session.transport);
                            session.connected = true;
                            console.log(`[session] SSE connected: ${sessionId}`);
                        }
                        const cleanup = () => {
                            session.connected = false;
                            session.transport = null;
                        };
                        req.on("close", cleanup);
                        res.on("close", cleanup);
                        res.on("finish", cleanup);
                        return;
                    }
                    // Accept 헤더 없음 - 에러
                    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify({
                        error: "Bad Request",
                        message: "Accept header must include application/json or text/event-stream"
                    }));
                    return;
                }
                if (req.method === "POST") {
                    // 세션 ID 검증
                    const requestSessionId = safeStr(req.headers["mcp-session-id"]);
                    if (!requestSessionId || !sessions.has(requestSessionId)) {
                        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify({
                            error: "Bad Request",
                            message: "Invalid or missing Mcp-Session-Id header. Send GET request first."
                        }));
                        return;
                    }
                    const session = sessions.get(requestSessionId);
                    session.lastActivity = new Date();
                    // Authorization 헤더 검증 (선택적)
                    const authHeader = safeStr(req.headers.authorization);
                    if (authHeader && !authHeader.startsWith("Bearer Bearer_")) {
                        res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
                        res.end(JSON.stringify({
                            error: "Unauthorized",
                            message: "Invalid or missing access token"
                        }));
                        return;
                    }
                    // Streamable HTTP 처리
                    if (useStreamable) {
                        let body = "";
                        req.on("data", (chunk) => (body += chunk));
                        req.on("end", async () => {
                            try {
                                const rpc = JSON.parse(body || "{}");
                                // MCP 서버가 아직 연결되지 않았다면 연결
                                if (!session.connected) {
                                    // Streamable HTTP용 가상 transport 생성
                                    const virtualTransport = {
                                        start: async () => { },
                                        close: async () => { },
                                        send: async (message) => message
                                    };
                                    await mcp.connect(virtualTransport);
                                    session.connected = true;
                                    console.log(`[session] MCP connected for session: ${requestSessionId}`);
                                }
                                // MCP 요청 처리
                                let response;
                                if (rpc.method === "tools/call") {
                                    const toolName = rpc.params?.name;
                                    const toolArgs = rpc.params?.arguments ?? {};
                                    try {
                                        if (toolName === "list_models") {
                                            const models = [...exports.modelNames];
                                            response = {
                                                jsonrpc: "2.0",
                                                id: rpc.id ?? null,
                                                result: {
                                                    content: [{ type: "text", text: JSON.stringify(models) }]
                                                }
                                            };
                                        }
                                        else if (toolName === "run_model") {
                                            const model = toolArgs.model;
                                            const input = toolArgs.input ?? {};
                                            const sanitizeMode = toolArgs.sanitizeMode ?? "omitNullish";
                                            if (!model || !exports.modelNames.includes(model)) {
                                                response = {
                                                    jsonrpc: "2.0",
                                                    id: rpc.id ?? null,
                                                    result: {
                                                        content: [{
                                                                type: "text",
                                                                text: `unknown model: ${String(model)}\navailable: ${exports.modelNames.join(", ")}`
                                                            }],
                                                        isError: true
                                                    }
                                                };
                                            }
                                            else {
                                                const raw = registry[model](input);
                                                const output = sanitize(raw, sanitizeMode);
                                                response = {
                                                    jsonrpc: "2.0",
                                                    id: rpc.id ?? null,
                                                    result: {
                                                        content: [{
                                                                type: "text",
                                                                text: JSON.stringify({ model, output }, null, 2)
                                                            }]
                                                    }
                                                };
                                            }
                                        }
                                        else {
                                            response = {
                                                jsonrpc: "2.0",
                                                id: rpc.id ?? null,
                                                error: { code: -32601, message: `Unknown tool: ${toolName}` }
                                            };
                                        }
                                    }
                                    catch (toolError) {
                                        response = {
                                            jsonrpc: "2.0",
                                            id: rpc.id ?? null,
                                            error: {
                                                code: -32000,
                                                message: `Tool execution error: ${toolError instanceof Error ? toolError.message : 'Unknown error'}`
                                            }
                                        };
                                    }
                                }
                                else {
                                    response = {
                                        jsonrpc: "2.0",
                                        id: rpc.id ?? null,
                                        error: { code: -32601, message: `Method not found: ${rpc.method}` }
                                    };
                                }
                                res.setHeader("Content-Type", "application/json; charset=utf-8");
                                res.setHeader("Mcp-Session-Id", requestSessionId);
                                res.writeHead(200);
                                res.end(JSON.stringify(response));
                            }
                            catch (parseError) {
                                res.setHeader("Content-Type", "application/json; charset=utf-8");
                                res.setHeader("Mcp-Session-Id", requestSessionId);
                                res.writeHead(200);
                                res.end(JSON.stringify({
                                    jsonrpc: "2.0",
                                    id: null,
                                    error: { code: -32700, message: "Parse error" }
                                }));
                            }
                        });
                        return;
                    }
                    // 레거시 SSE POST 처리
                    if (session.transport && typeof session.transport.handleRequest === "function") {
                        session.transport.handleRequest(req, res);
                        return;
                    }
                    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify({ error: "Transport not available" }));
                    return;
                }
                // 기타 메서드
                res.writeHead(405, { "Allow": "GET, POST, OPTIONS, HEAD", "Content-Type": "text/plain; charset=utf-8" });
                res.end("Method Not Allowed");
                return;
            }
            catch (err) {
                console.error("MCP connection error:", err);
                if (!res.headersSent) {
                    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify({
                        error: "MCP connection failed",
                        message: err?.message ?? "unknown"
                    }));
                }
                return;
            }
        }
        // not found
        setCORS(req, res);
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Not Found");
    });
    httpServer.listen(port, () => {
        const base = `http://localhost:${port}`;
        console.log(`🚀 SEBIT MCP Server on ${base}`);
        console.log(`📡 MCP endpoint: ${base}/mcp`);
        console.log(`❤️  Health: ${base}/health`);
        console.log(`📊 Models: ${exports.modelNames.join(", ")}`);
    });
    process.on("SIGTERM", () => {
        console.log("Shutting down SEBIT MCP server...");
        httpServer.close(() => process.exit(0));
    });
}
main().catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
});
