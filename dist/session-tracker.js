"use strict";
// =============================
// FILE: /src/session-tracker.ts
// 세션별 모델 실행 기록 추적 및 보고서 생성 기능
// =============================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionTracker = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const logger_1 = require("./logger");
// 메모리 기반 세션 저장소 (실제 환경에서는 DB나 파일 시스템 사용 권장)
class SessionTracker {
    sessions = new Map();
    currentSessionId;
    constructor() {
        this.currentSessionId = this.generateSessionId();
        this.initializeSession();
    }
    generateSessionId() {
        return `session_${(0, dayjs_1.default)().format('YYYY-MM-DD_HH-mm-ss')}_${Math.random().toString(36).substr(2, 9)}`;
    }
    initializeSession() {
        const sessionData = {
            sessionId: this.currentSessionId,
            startTime: (0, dayjs_1.default)().toISOString(),
            executions: []
        };
        this.sessions.set(this.currentSessionId, sessionData);
        logger_1.Logger.info(`New session initialized: ${this.currentSessionId}`);
    }
    // 모델 실행 기록 추가
    logExecution(execution) {
        const currentSession = this.sessions.get(this.currentSessionId);
        if (currentSession) {
            const logEntry = {
                ...execution,
                timestamp: (0, dayjs_1.default)().toISOString()
            };
            currentSession.executions.push(logEntry);
            logger_1.Logger.debug(`Model execution logged: ${execution.modelName} (${execution.success ? 'SUCCESS' : 'FAILED'}) - ${execution.executionTime}ms`);
        }
    }
    // 현재 세션 데이터 반환
    getCurrentSession() {
        return this.sessions.get(this.currentSessionId);
    }
    // 모든 세션 데이터 반환
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    // 새 세션 시작
    startNewSession() {
        this.currentSessionId = this.generateSessionId();
        this.initializeSession();
        return this.currentSessionId;
    }
    // 특정 날짜의 세션들 반환
    getSessionsByDate(date) {
        return Array.from(this.sessions.values()).filter(session => (0, dayjs_1.default)(session.startTime).format('YYYY-MM-DD') === date);
    }
}
// 싱글톤 인스턴스
exports.sessionTracker = new SessionTracker();
