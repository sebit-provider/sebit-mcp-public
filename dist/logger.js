"use strict";
// =============================
// FILE: /src/logger.ts
// MCP 서버용 파일 기반 로깅 유틸리티
// stdout/stderr 오염 방지를 위해 debug.log 파일에만 기록
// =============================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs_1 = __importDefault(require("fs"));
class Logger {
    static LOG_FILE = 'debug.log';
    static log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        try {
            fs_1.default.appendFileSync(Logger.LOG_FILE, logEntry);
        }
        catch (error) {
            // 로그 실패 시에도 stdout/stderr에 출력하지 않음
            // MCP 프로토콜 오염 방지가 최우선
        }
    }
    static error(message, error) {
        const timestamp = new Date().toISOString();
        const errorMessage = error ? `${message} - ${error.message}` : message;
        const logEntry = `[${timestamp}] ERROR: ${errorMessage}\n`;
        try {
            fs_1.default.appendFileSync(Logger.LOG_FILE, logEntry);
        }
        catch (logError) {
            // 로그 실패 시에도 stdout/stderr에 출력하지 않음
        }
    }
    static info(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] INFO: ${message}\n`;
        try {
            fs_1.default.appendFileSync(Logger.LOG_FILE, logEntry);
        }
        catch (error) {
            // 로그 실패 시에도 stdout/stderr에 출력하지 않음
        }
    }
    static debug(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] DEBUG: ${message}\n`;
        try {
            fs_1.default.appendFileSync(Logger.LOG_FILE, logEntry);
        }
        catch (error) {
            // 로그 실패 시에도 stdout/stderr에 출력하지 않음
        }
    }
    // 서버 시작 시 로그 파일 초기화
    static init() {
        try {
            const initMessage = `[${new Date().toISOString()}] ========== SEBIT MCP Server Started ==========\n`;
            fs_1.default.writeFileSync(Logger.LOG_FILE, initMessage);
        }
        catch (error) {
            // 초기화 실패 시에도 stdout/stderr에 출력하지 않음
        }
    }
}
exports.Logger = Logger;
