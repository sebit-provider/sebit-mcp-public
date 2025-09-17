"use strict";
// =============================
// FILE: /src/report-generator.ts
// 세션 분석 보고서 생성 및 PDF 저장 기능
// =============================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
const jspdf_1 = require("jspdf");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const dayjs_1 = __importDefault(require("dayjs"));
const logger_1 = require("./logger");
// 모델별 설명과 사용 용도
const modelDescriptions = {
    dda: {
        description: "Dynamic Depreciation Analysis - 동적 감가상각 분석",
        purpose: "자산의 시간에 따른 가치 감소를 동적으로 계산하여 정확한 감가상각 비용 산출",
        insights: "감가상각 방식의 최적화를 통해 세무 효율성을 높이고, 정확한 자산 가치 평가가 가능합니다."
    },
    lam: {
        description: "Lease Asset Model - 리스 자산 모델",
        purpose: "리스 계약에 따른 자산과 부채의 초기 인식 및 후속 측정을 위한 회계 처리",
        insights: "IFRS 16 기준에 따른 리스 회계 처리로 재무상태표의 투명성을 제고할 수 있습니다."
    },
    rvm: {
        description: "Resource Valuation Model - 자원 가치 평가 모델",
        purpose: "기업이 보유한 다양한 자원의 공정가치 평가 및 가치 변동 분석",
        insights: "자원의 정확한 가치 평가를 통해 투자 의사결정과 자원 배분 최적화가 가능합니다."
    },
    ceem: {
        description: "Consumable Expense Model - 소모성 비용 모델",
        purpose: "소모성 자산의 사용 패턴 분석 및 비용 배분의 최적화",
        insights: "소모성 자산의 효율적 관리로 운영 비용을 절감하고 예산 계획의 정확성을 높일 수 있습니다."
    },
    bdm: {
        description: "Bond Effective Interest Model - 채권 유효이자율 모델",
        purpose: "채권의 유효이자율법에 따른 이자비용 계산 및 장부가액 조정",
        insights: "정확한 이자비용 인식으로 재무성과의 신뢰성을 높이고, 채권 관리 전략 수립이 가능합니다."
    },
    belm: {
        description: "Bank Expected Loss Model - 은행 기대손실 모델",
        purpose: "IFRS 9에 따른 금융자산의 기대신용손실 측정 및 충당금 설정",
        insights: "선제적 손실 인식을 통해 리스크 관리를 강화하고, 건전성 지표를 개선할 수 있습니다."
    },
    cprm: {
        description: "Convertible Bond Risk Model - 전환사채 위험 모델",
        purpose: "전환사채의 전환 옵션 가치 평가 및 리스크 헤지 전략 수립",
        insights: "전환사채의 복합금융상품 특성을 반영한 정확한 가치평가로 투자 리스크를 최소화할 수 있습니다."
    },
    ocim: {
        description: "OCI Compounded Increase Model - 기타포괄손익 복리증가 모델",
        purpose: "기타포괄손익 항목의 복리 효과를 고려한 누적 변동액 계산",
        insights: "기타포괄손익의 장기적 영향을 정확히 파악하여 자본 관리 전략을 수립할 수 있습니다."
    },
    farex: {
        description: "Foreign Exchange Adjustment Model - 외환 조정 모델",
        purpose: "외화표시 자산·부채의 환율 변동에 따른 환산차이 계산 및 헤지 효과 분석",
        insights: "환율 리스크 관리를 통해 외환 변동성으로 인한 손실을 최소화하고 안정적인 수익성을 확보할 수 있습니다."
    },
    tctbeam: {
        description: "Trigonometric Breakeven Analysis Model - 삼각함수 손익분기점 모델",
        purpose: "주기적 변동을 고려한 손익분기점 분석 및 최적 운영점 도출",
        insights: "계절성이나 주기적 변동이 있는 사업의 경우, 보다 정확한 손익분기점 분석으로 운영 효율성을 극대화할 수 있습니다."
    },
    cpmrv: {
        description: "Crypto Real Value Model - 암호화폐 실질가치 모델",
        purpose: "암호화폐 자산의 실질 가치 평가 및 변동성 리스크 분석",
        insights: "암호화폐의 높은 변동성을 고려한 실질 가치 평가로 디지털 자산 투자 전략을 수립할 수 있습니다."
    },
    dcbpra: {
        description: "Beta-Adjusted Return Analysis Model - 베타 조정 수익률 분석 모델",
        purpose: "시장 베타를 조정한 위험조정수익률 계산 및 투자성과 평가",
        insights: "시장 리스크를 고려한 정확한 성과 평가로 포트폴리오 최적화 및 투자 전략 개선이 가능합니다."
    },
    journal: {
        description: "Journalizing Model - 분개 및 분개장 생성",
        purpose: "회계 거래의 분개 처리 및 분개장 자동 생성",
        insights: "회계 실무를 위한 도구로서 분석 보고서 대상에서 제외됩니다."
    }
};
class ReportGenerator {
    static DEFAULT_SAVE_PATH = path_1.default.join(process.env.USERPROFILE || 'C:\\Users\\USER', 'Documents', 'SEBIT-MCP-Reports');
    constructor() {
        // 기본 저장 경로 생성
        this.ensureDirectoryExists(ReportGenerator.DEFAULT_SAVE_PATH);
    }
    async ensureDirectoryExists(dirPath) {
        try {
            await fs_extra_1.default.ensureDir(dirPath);
            logger_1.Logger.debug(`Directory ensured: ${dirPath}`);
        }
        catch (error) {
            logger_1.Logger.error(`Failed to create directory: ${dirPath}`, error);
        }
    }
    // 세션 분석 수행 (journal 모델 제외)
    analyzeSession(sessionData) {
        // journal 모델을 제외한 실행 기록만 분석 대상으로 사용
        const analysisExecutions = sessionData.executions.filter(exec => exec.modelName !== 'journal');
        const allExecutions = sessionData.executions; // 전체 통계용
        const totalExecutions = allExecutions.length;
        const successfulExecutions = allExecutions.filter(e => e.success).length;
        const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
        // 모델 사용 빈도 계산 (journal 제외)
        const modelCounts = new Map();
        analysisExecutions.forEach(exec => {
            const count = modelCounts.get(exec.modelName) || 0;
            modelCounts.set(exec.modelName, count + 1);
        });
        const mostUsedModels = Array.from(modelCounts.entries())
            .map(([model, count]) => ({ model, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        // 평균 실행 시간 (전체 포함)
        const avgExecutionTime = totalExecutions > 0
            ? allExecutions.reduce((sum, exec) => sum + exec.executionTime, 0) / totalExecutions
            : 0;
        // 시간 범위 (전체 포함)
        const timestamps = allExecutions.map(e => e.timestamp).sort();
        const timeRange = {
            start: timestamps.length > 0 ? timestamps[0] : sessionData.startTime,
            end: timestamps.length > 0 ? timestamps[timestamps.length - 1] : sessionData.startTime
        };
        // 오류 요약 (전체 포함, journal은 제외하지 않음)
        const errorSummary = allExecutions
            .filter(e => !e.success && e.error)
            .map(e => `${e.modelName}: ${e.error}`)
            .slice(0, 5); // 최대 5개만
        return {
            totalExecutions,
            successRate,
            mostUsedModels,
            avgExecutionTime,
            timeRange,
            errorSummary
        };
    }
    // PDF 보고서 생성
    async generateSessionReport(sessionData, savePath, customAnalysis) {
        const analysis = this.analyzeSession(sessionData);
        const doc = new jspdf_1.jsPDF();
        // 한글 폰트 설정 (기본 폰트 사용)
        let yPosition = 20;
        const lineHeight = 7;
        const pageWidth = doc.internal.pageSize.getWidth();
        // 헤더
        doc.setFontSize(18);
        doc.text('SEBIT MCP 세션 분석 보고서', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += lineHeight * 2;
        doc.setFontSize(12);
        doc.text(`생성일시: ${(0, dayjs_1.default)().format('YYYY-MM-DD HH:mm:ss')}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`세션 ID: ${sessionData.sessionId}`, 20, yPosition);
        yPosition += lineHeight * 2;
        // 세션 요약
        doc.setFontSize(14);
        doc.text('=== 세션 요약 ===', 20, yPosition);
        yPosition += lineHeight * 1.5;
        doc.setFontSize(10);
        const journalCount = sessionData.executions.filter(e => e.modelName === 'journal').length;
        const analysisCount = analysis.totalExecutions - journalCount;
        doc.text(`총 실행 모델 수: ${analysis.totalExecutions}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`  - 분석 모델: ${analysisCount}개, 분개 처리: ${journalCount}개`, 25, yPosition);
        yPosition += lineHeight;
        doc.text(`성공률: ${analysis.successRate.toFixed(1)}%`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`평균 실행 시간: ${analysis.avgExecutionTime.toFixed(2)}ms`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`세션 기간: ${(0, dayjs_1.default)(analysis.timeRange.start).format('HH:mm:ss')} ~ ${(0, dayjs_1.default)(analysis.timeRange.end).format('HH:mm:ss')}`, 20, yPosition);
        yPosition += lineHeight * 2;
        // 가장 많이 사용된 모델들
        if (analysis.mostUsedModels.length > 0) {
            doc.setFontSize(14);
            doc.text('=== 주요 사용 모델 ===', 20, yPosition);
            yPosition += lineHeight * 1.5;
            doc.setFontSize(10);
            analysis.mostUsedModels.forEach(({ model, count }) => {
                const desc = modelDescriptions[model];
                doc.text(`${count}회 - ${desc.description}`, 20, yPosition);
                yPosition += lineHeight;
            });
            yPosition += lineHeight;
        }
        // 모델별 상세 분석 및 인사이트
        if (analysis.mostUsedModels.length > 0) {
            doc.setFontSize(14);
            doc.text('=== 상세 분석 및 인사이트 ===', 20, yPosition);
            yPosition += lineHeight * 1.5;
            for (const { model, count } of analysis.mostUsedModels.slice(0, 3)) { // 상위 3개만
                // journal 모델은 상세 분석에서 제외
                if (model === 'journal')
                    continue;
                const desc = modelDescriptions[model];
                // 페이지 넘김 체크
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.setFontSize(12);
                doc.text(`${desc.description} (${count}회 실행)`, 20, yPosition);
                yPosition += lineHeight * 1.2;
                doc.setFontSize(9);
                // 텍스트 줄 바꿈 처리
                const purposeLines = doc.splitTextToSize(`용도: ${desc.purpose}`, pageWidth - 40);
                doc.text(purposeLines, 20, yPosition);
                yPosition += lineHeight * purposeLines.length + 3;
                const insightLines = doc.splitTextToSize(`인사이트: ${desc.insights}`, pageWidth - 40);
                doc.text(insightLines, 20, yPosition);
                yPosition += lineHeight * insightLines.length + lineHeight;
            }
        }
        // 오류 요약 (있는 경우)
        if (analysis.errorSummary.length > 0) {
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }
            doc.setFontSize(14);
            doc.text('=== 오류 분석 ===', 20, yPosition);
            yPosition += lineHeight * 1.5;
            doc.setFontSize(9);
            analysis.errorSummary.forEach(error => {
                const errorLines = doc.splitTextToSize(`• ${error}`, pageWidth - 40);
                doc.text(errorLines, 20, yPosition);
                yPosition += lineHeight * errorLines.length;
            });
            yPosition += lineHeight;
        }
        // 종합 의견 및 솔루션
        if (yPosition > 230) {
            doc.addPage();
            yPosition = 20;
        }
        doc.setFontSize(14);
        doc.text('=== 종합 의견 및 개선 방안 ===', 20, yPosition);
        yPosition += lineHeight * 1.5;
        doc.setFontSize(9);
        // 기본 분석 의견
        let opinion = '';
        if (analysis.successRate >= 90) {
            opinion = '우수한 성능: 모델 실행이 매우 안정적으로 수행되었습니다. 현재 설정을 유지하면서 추가적인 최적화를 고려해볼 수 있습니다.';
        }
        else if (analysis.successRate >= 70) {
            opinion = '양호한 성능: 대부분의 모델이 정상적으로 실행되었으나, 일부 오류 케이스에 대한 검토가 필요합니다.';
        }
        else {
            opinion = '주의 필요: 실행 실패율이 높아 입력 데이터 검증 및 모델 안정성 개선이 필요합니다.';
        }
        // 사용자 정의 분석이 있는 경우 추가
        if (customAnalysis) {
            opinion += `\n\n추가 분석: ${customAnalysis}`;
        }
        const opinionLines = doc.splitTextToSize(opinion, pageWidth - 40);
        doc.text(opinionLines, 20, yPosition);
        yPosition += lineHeight * opinionLines.length + lineHeight;
        // 권장 사항
        const recommendations = [
            '정기적인 모델 성능 모니터링 및 최적화',
            '입력 데이터 품질 검증 프로세스 강화',
            '오류 발생 패턴 분석을 통한 예방적 조치 수립',
            '자주 사용되는 모델의 성능 튜닝 고려'
        ];
        doc.setFontSize(10);
        doc.text('권장 사항:', 20, yPosition);
        yPosition += lineHeight * 1.2;
        doc.setFontSize(9);
        recommendations.forEach((rec, index) => {
            doc.text(`${index + 1}. ${rec}`, 25, yPosition);
            yPosition += lineHeight;
        });
        // 파일 저장
        const finalSavePath = savePath || ReportGenerator.DEFAULT_SAVE_PATH;
        await this.ensureDirectoryExists(finalSavePath);
        const fileName = `SEBIT-MCP-Report_${(0, dayjs_1.default)().format('YYYY-MM-DD_HH-mm-ss')}.pdf`;
        const fullPath = path_1.default.join(finalSavePath, fileName);
        const pdfBuffer = doc.output('arraybuffer');
        await fs_extra_1.default.writeFile(fullPath, Buffer.from(pdfBuffer));
        logger_1.Logger.info(`Session report generated successfully: ${fullPath}`);
        return fullPath;
    }
}
exports.ReportGenerator = ReportGenerator;
