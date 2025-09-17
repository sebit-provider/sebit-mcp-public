"use strict";
// =============================
// FILE: /src/pdf-generator.ts
// 한글 지원 PDF 생성기
// HTML to PDF 방식으로 한글 깨짐 문제 해결
// =============================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiLanguagePDFGenerator = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const dayjs_1 = __importDefault(require("dayjs"));
const logger_1 = require("./logger");
// 다국어 텍스트 정의
const i18n = {
    ko: {
        reportTitle: 'SEBIT MCP 세션 분석 보고서',
        executiveSummary: '실행 요약',
        detailedAnalysis: '모델별 상세 분석',
        strategicInsights: '전략적 인사이트',
        recommendations: '권장 사항',
        risks: '리스크 요인',
        opportunities: '기회 요소',
        totalExecutions: '총 실행 횟수',
        successRate: '성공률',
        avgExecutionTime: '평균 실행 시간',
        mostUsedModels: '가장 많이 사용된 모델',
        reportGenerated: '보고서 생성일시',
        modelDescriptions: {
        // 기존 한국어 설명들...
        },
        standardRecommendations: [
            '정기적인 모델 성능 모니터링 및 최적화',
            '입력 데이터 품질 검증 프로세스 강화',
            '오류 발생 패턴 분석을 통한 예방적 조치 수립',
            '자주 사용되는 모델의 성능 튜닝 고려'
        ]
    },
    en: {
        reportTitle: 'SEBIT MCP Session Analysis Report',
        executiveSummary: 'Executive Summary',
        detailedAnalysis: 'Detailed Model Analysis',
        strategicInsights: 'Strategic Insights',
        recommendations: 'Recommendations',
        risks: 'Risk Factors',
        opportunities: 'Opportunities',
        totalExecutions: 'Total Executions',
        successRate: 'Success Rate',
        avgExecutionTime: 'Average Execution Time',
        mostUsedModels: 'Most Used Models',
        reportGenerated: 'Report Generated',
        modelDescriptions: {
        // 영어 설명들을 추가...
        },
        standardRecommendations: [
            'Regular monitoring and optimization of model performance',
            'Strengthen input data quality validation processes',
            'Establish preventive measures through error pattern analysis',
            'Consider performance tuning for frequently used models'
        ]
    }
};
// 다국어 모델 설명
const modelDescriptions = {
    ko: {
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
    },
    en: {
        dda: {
            description: "Dynamic Depreciation Analysis",
            purpose: "Dynamic calculation of asset value decline over time for accurate depreciation expense calculation",
            insights: "Optimize depreciation methods to enhance tax efficiency and enable accurate asset valuation."
        },
        lam: {
            description: "Lease Asset Model",
            purpose: "Initial recognition and subsequent measurement of lease assets and liabilities under accounting standards",
            insights: "Enhance financial statement transparency through IFRS 16 compliant lease accounting treatment."
        },
        rvm: {
            description: "Resource Valuation Model",
            purpose: "Fair value assessment and valuation change analysis of various enterprise resources",
            insights: "Enable investment decision-making and resource allocation optimization through accurate resource valuation."
        },
        ceem: {
            description: "Consumable Expense Model",
            purpose: "Usage pattern analysis and cost allocation optimization for consumable assets",
            insights: "Reduce operational costs and improve budget planning accuracy through efficient consumable asset management."
        },
        bdm: {
            description: "Bond Effective Interest Model",
            purpose: "Interest expense calculation and book value adjustment using effective interest method for bonds",
            insights: "Enhance financial performance reliability through accurate interest expense recognition and enable bond management strategy development."
        },
        belm: {
            description: "Bank Expected Loss Model",
            purpose: "Expected credit loss measurement and provision setting for financial assets under IFRS 9",
            insights: "Strengthen risk management and improve soundness indicators through proactive loss recognition."
        },
        cprm: {
            description: "Convertible Bond Risk Model",
            purpose: "Conversion option valuation and risk hedging strategy development for convertible bonds",
            insights: "Minimize investment risk through accurate valuation reflecting the hybrid financial instrument characteristics of convertible bonds."
        },
        ocim: {
            description: "Operational Cost Impact Model",
            purpose: "Analysis of cost impact on operational efficiency and optimization strategy development",
            insights: "Improve operational efficiency and cost structure optimization through systematic cost impact analysis."
        },
        farex: {
            description: "Foreign Exchange Adjustment Model",
            purpose: "Calculation of translation differences from exchange rate fluctuations and hedge effect analysis for foreign currency assets/liabilities",
            insights: "Minimize losses from exchange rate volatility and secure stable profitability through exchange rate risk management."
        },
        tctbeam: {
            description: "Trigonometric Breakeven Analysis Model",
            purpose: "Breakeven analysis considering periodic fluctuations and optimal operating point derivation",
            insights: "Maximize operational efficiency through more accurate breakeven analysis for businesses with seasonality or periodic variations."
        },
        cpmrv: {
            description: "Crypto Real Value Model",
            purpose: "Real value assessment and volatility risk analysis for cryptocurrency assets",
            insights: "Develop digital asset investment strategies through real value evaluation considering high volatility of cryptocurrencies."
        },
        dcbpra: {
            description: "Beta-Adjusted Return Analysis Model",
            purpose: "Risk-adjusted return calculation and investment performance evaluation with market beta adjustment",
            insights: "Enable portfolio optimization and investment strategy improvement through accurate performance evaluation considering market risk."
        },
        journal: {
            description: "Journalizing Model",
            purpose: "Journal entry processing and automatic journal generation for accounting transactions",
            insights: "Excluded from analysis reports as a practical accounting tool."
        }
    }
};
class MultiLanguagePDFGenerator {
    // 기본 경로를 강제로 고정 (환경변수에 의존하지 않음)
    static DEFAULT_SAVE_PATH = 'C:\\Users\\user\\Documents\\SEBIT-MCP-Reports';
    constructor() {
        this.ensureDirectoryExists(MultiLanguagePDFGenerator.DEFAULT_SAVE_PATH);
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
    // 고급 분석 수행 (클로드 수준의 상세 분석)
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
    // 전략적 인사이트 생성 (클로드 스타일)
    generateStrategicInsights(sessionData, analysis) {
        const { mostUsedModels, successRate, totalExecutions } = analysis;
        const insights = [];
        // 사용 패턴 분석
        if (mostUsedModels.length > 0) {
            const topModel = mostUsedModels[0];
            const modelCategory = this.categorizeModel(topModel.model);
            insights.push(`**주요 분석 영역**: ${modelCategory.category}에 집중하여 ${topModel.count}회 실행하셨습니다. ${modelCategory.strategicImplication}`);
        }
        // 다양성 분석
        const uniqueModels = new Set(sessionData.executions.map(e => e.modelName)).size;
        if (uniqueModels >= 5) {
            insights.push(`**분석 범위의 다양성**: ${uniqueModels}개의 서로 다른 모델을 활용하여 다각도 분석을 수행하셨습니다. 이는 종합적인 리스크 관리 접근법을 보여줍니다.`);
        }
        else if (uniqueModels <= 2) {
            insights.push(`**전문화된 분석**: ${uniqueModels}개의 특정 모델에 집중하여 심층 분석을 수행하셨습니다. 해당 영역의 전문성을 높이는 접근법입니다.`);
        }
        // 성과 분석
        if (successRate >= 95) {
            insights.push(`**실행 안정성**: ${successRate.toFixed(1)}%의 높은 성공률을 달성하여 데이터 품질과 모델 활용 숙련도가 우수합니다.`);
        }
        else if (successRate < 80) {
            insights.push(`**개선 기회**: ${successRate.toFixed(1)}%의 성공률로 입력 데이터 검증이나 모델 파라미터 조정이 필요해 보입니다.`);
        }
        // 시간대 분석
        const executions = sessionData.executions;
        if (executions.length > 0) {
            const timeSpan = new Date(analysis.timeRange.end).getTime() - new Date(analysis.timeRange.start).getTime();
            const minutes = timeSpan / (1000 * 60);
            if (minutes < 30) {
                insights.push(`**집중적 분석**: ${minutes.toFixed(0)}분 내에 ${totalExecutions}회 실행하여 신속한 의사결정을 위한 집중적 분석을 수행하셨습니다.`);
            }
            else if (minutes > 120) {
                insights.push(`**심층 연구**: ${(minutes / 60).toFixed(1)}시간에 걸친 체계적 분석으로 신중한 검토 과정을 거치셨습니다.`);
            }
        }
        return insights.join('\n\n');
    }
    // 모델 카테고리 분류
    categorizeModel(modelName) {
        const categories = {
            dda: {
                category: "자산 관리",
                strategicImplication: "자산의 생명주기 관리와 최적 감가상각 전략 수립에 중점을 두고 계시네요."
            },
            lam: {
                category: "리스 회계",
                strategicImplication: "IFRS 16 도입에 따른 리스 자산·부채 관리의 정확성을 높이고 계십니다."
            },
            rvm: {
                category: "가치 평가",
                strategicImplication: "자원의 공정가치 산정을 통한 투자 의사결정 지원에 활용하고 계시네요."
            },
            ceem: {
                category: "비용 관리",
                strategicImplication: "소모성 자산의 효율적 관리를 통한 운영 비용 최적화를 추구하고 계십니다."
            },
            bdm: {
                category: "채권 관리",
                strategicImplication: "채권 포트폴리오의 이자 리스크 관리와 수익성 분석에 집중하고 계시네요."
            },
            belm: {
                category: "신용 리스크",
                strategicImplication: "IFRS 9 기준의 선제적 손실 인식으로 건전성 관리를 강화하고 계십니다."
            },
            cprm: {
                category: "복합 상품",
                strategicImplication: "전환사채의 옵션 가치와 리스크를 정밀하게 분석하여 투자 전략을 수립하고 계시네요."
            },
            ocim: {
                category: "자본 관리",
                strategicImplication: "기타포괄손익의 장기적 영향을 고려한 자본 전략 수립에 활용하고 계십니다."
            },
            farex: {
                category: "환율 리스크",
                strategicImplication: "외환 노출 관리와 헤지 전략을 통한 안정적 수익성 확보에 중점을 두고 계시네요."
            },
            tctbeam: {
                category: "손익분기 분석",
                strategicImplication: "삼각함수를 활용한 고도화된 손익분기점 분석으로 운영 효율성을 극대화하고 계십니다."
            },
            cpmrv: {
                category: "디지털 자산",
                strategicImplication: "암호화폐의 변동성을 고려한 실질 가치 평가로 신흥 자산군 투자 전략을 구축하고 계시네요."
            },
            dcbpra: {
                category: "성과 평가",
                strategicImplication: "시장 베타 조정을 통한 정확한 위험조정수익률 산출로 포트폴리오 최적화를 추구하고 계십니다."
            },
            journal: {
                category: "회계 실무",
                strategicImplication: "정확한 분개 처리로 회계 시스템의 신뢰성을 확보하고 계십니다."
            }
        };
        return categories[modelName];
    }
    // 리스크 및 기회 분석
    analyzeRisksAndOpportunities(sessionData, analysis) {
        const risks = [];
        const opportunities = [];
        // 모델 조합 분석
        const modelTypes = analysis.mostUsedModels.map((m) => this.categorizeModel(m.model).category);
        const uniqueCategories = new Set(modelTypes);
        if (uniqueCategories.has("신용 리스크") && uniqueCategories.has("채권 관리")) {
            opportunities.push("신용리스크와 채권관리 모델의 조합으로 통합적 채권 포트폴리오 리스크 관리 체계 구축 가능");
        }
        if (uniqueCategories.has("환율 리스크") && uniqueCategories.has("디지털 자산")) {
            risks.push("외환과 암호화폐의 이중 변동성 노출로 인한 복합 리스크 발생 가능성");
            opportunities.push("다양한 자산군 간 상관관계 분석을 통한 리스크 분산 효과 극대화 가능");
        }
        // 성과 기반 분석
        if (analysis.successRate < 80) {
            risks.push("모델 실행 실패율이 높아 의사결정 신뢰성에 영향을 줄 수 있음");
        }
        if (analysis.totalExecutions >= 10) {
            opportunities.push("충분한 분석 데이터 축적으로 패턴 인식 및 예측 정확도 향상 가능");
        }
        return { risks, opportunities };
    }
    // HTML 생성 (한글 지원)
    generateHTML(sessionData, customAnalysis, claudeAnalysis, language = 'ko') {
        const analysis = this.analyzeSession(sessionData);
        const strategicInsights = this.generateStrategicInsights(sessionData, analysis);
        const risksAndOpportunities = this.analyzeRisksAndOpportunities(sessionData, analysis);
        const texts = i18n[language];
        const models = modelDescriptions[language];
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
        // 권장 사항
        const recommendations = [
            '정기적인 모델 성능 모니터링 및 최적화',
            '입력 데이터 품질 검증 프로세스 강화',
            '오류 발생 패턴 분석을 통한 예방적 조치 수립',
            '자주 사용되는 모델의 성능 튜닝 고려'
        ];
        const journalCount = sessionData.executions.filter(e => e.modelName === 'journal').length;
        const analysisCount = analysis.totalExecutions - journalCount;
        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEBIT MCP 세션 분석 보고서</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');

        body {
            font-family: 'Noto Sans KR', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
        }

        .header {
            text-align: center;
            border-bottom: 3px solid #4ECDC4;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .header h1 {
            color: #2C3E50;
            font-size: 24px;
            font-weight: 700;
            margin: 0;
        }

        .header .subtitle {
            color: #7F8C8D;
            font-size: 14px;
            margin-top: 10px;
        }

        .section {
            margin-bottom: 30px;
            padding: 20px;
            border-left: 4px solid #4ECDC4;
            background-color: #F8F9FA;
        }

        .section h2 {
            color: #2C3E50;
            font-size: 18px;
            font-weight: 600;
            margin-top: 0;
            margin-bottom: 15px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }

        .stat-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #E0E6ED;
        }

        .stat-label {
            font-size: 12px;
            color: #7F8C8D;
            margin-bottom: 5px;
        }

        .stat-value {
            font-size: 16px;
            font-weight: 600;
            color: #2C3E50;
        }

        .model-item {
            background: white;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 8px;
            border: 1px solid #E0E6ED;
        }

        .model-title {
            font-weight: 600;
            color: #2C3E50;
            margin-bottom: 8px;
        }

        .model-purpose {
            font-size: 13px;
            color: #5D6D7E;
            margin-bottom: 8px;
        }

        .model-insights {
            font-size: 13px;
            color: #34495E;
            background: #EBF5FF;
            padding: 10px;
            border-radius: 5px;
            border-left: 3px solid #3498DB;
        }

        .error-item {
            background: #FFF5F5;
            border: 1px solid #FED7D7;
            border-radius: 5px;
            padding: 10px;
            margin-bottom: 8px;
            font-size: 13px;
            color: #C53030;
        }

        .recommendation {
            background: #F0FFF4;
            border: 1px solid #C6F6D5;
            border-radius: 5px;
            padding: 10px;
            margin-bottom: 8px;
            font-size: 13px;
            color: #2F855A;
        }

        .opinion-text {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #E0E6ED;
            line-height: 1.7;
            white-space: pre-line;
        }

        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>SEBIT MCP 세션 분석 보고서</h1>
        <div class="subtitle">
            생성일시: ${(0, dayjs_1.default)().format('YYYY년 MM월 DD일 HH:mm:ss')}<br>
            세션 ID: ${sessionData.sessionId}
        </div>
    </div>

    <div class="section">
        <h2>📊 세션 요약</h2>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">총 실행 모델 수</div>
                <div class="stat-value">${analysis.totalExecutions}개</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">성공률</div>
                <div class="stat-value">${analysis.successRate.toFixed(1)}%</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">평균 실행 시간</div>
                <div class="stat-value">${analysis.avgExecutionTime.toFixed(2)}ms</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">세션 기간</div>
                <div class="stat-value">${(0, dayjs_1.default)(analysis.timeRange.start).format('HH:mm:ss')} ~ ${(0, dayjs_1.default)(analysis.timeRange.end).format('HH:mm:ss')}</div>
            </div>
        </div>
        <div style="font-size: 13px; color: #7F8C8D;">
            - 분석 모델: ${analysisCount}개, 분개 처리: ${journalCount}개
        </div>
    </div>

    ${analysis.mostUsedModels.length > 0 ? `
    <div class="section">
        <h2>🔍 주요 사용 모델</h2>
        ${analysis.mostUsedModels.map(({ model, count }) => {
            const desc = models[model];
            return `<div style="margin-bottom: 10px; padding: 8px; background: white; border-radius: 5px;">
            <strong>${count}회</strong> - ${desc.description}
          </div>`;
        }).join('')}
    </div>
    ` : ''}

    ${analysis.mostUsedModels.filter(({ model }) => model !== 'journal').length > 0 ? `
    <div class="section page-break">
        <h2>📈 상세 분석 및 인사이트</h2>
        ${analysis.mostUsedModels.filter(({ model }) => model !== 'journal').slice(0, 3).map(({ model, count }) => {
            const desc = models[model];
            return `
          <div class="model-item">
            <div class="model-title">${desc.description} (${count}회 실행)</div>
            <div class="model-purpose"><strong>용도:</strong> ${desc.purpose}</div>
            <div class="model-insights"><strong>인사이트:</strong> ${desc.insights}</div>
          </div>
          `;
        }).join('')}
    </div>
    ` : ''}

    ${claudeAnalysis ? `
    <div class="section">
        <h2>🤖 클로드 분석 보고서</h2>
        <div class="opinion-text" style="white-space: pre-line; line-height: 1.8;">${claudeAnalysis}</div>
    </div>
    ` : `
    <div class="section">
        <h2>🧠 전략적 분석</h2>
        <div class="opinion-text">${strategicInsights}</div>
    </div>
    `}

    ${risksAndOpportunities.risks.length > 0 || risksAndOpportunities.opportunities.length > 0 ? `
    <div class="section">
        <h2>⚠️ 리스크 및 기회 분석</h2>
        ${risksAndOpportunities.risks.length > 0 ? `
        <h3 style="color: #E74C3C; margin-bottom: 10px;">🚨 주요 리스크</h3>
        ${risksAndOpportunities.risks.map(risk => `<div class="error-item" style="background: #FADBD8; border: 1px solid #E74C3C; color: #A93226;">• ${risk}</div>`).join('')}
        ` : ''}

        ${risksAndOpportunities.opportunities.length > 0 ? `
        <h3 style="color: #27AE60; margin-bottom: 10px; margin-top: 20px;">🌟 발견된 기회</h3>
        ${risksAndOpportunities.opportunities.map(opportunity => `<div class="recommendation" style="background: #D5F4E6; border: 1px solid #27AE60; color: #1E8449;">• ${opportunity}</div>`).join('')}
        ` : ''}
    </div>
    ` : ''}

    ${analysis.errorSummary.length > 0 ? `
    <div class="section">
        <h2>⚠️ 오류 분석</h2>
        ${analysis.errorSummary.map(error => `<div class="error-item">• ${error}</div>`).join('')}
    </div>
    ` : ''}

    <div class="section page-break">
        <h2>💡 종합 의견 및 개선 방안</h2>
        <div class="opinion-text">${opinion}</div>

        <h3 style="margin-top: 25px; margin-bottom: 15px; color: #2C3E50;">권장 사항:</h3>
        ${recommendations.map((rec, index) => `<div class="recommendation">${index + 1}. ${rec}</div>`).join('')}
    </div>

    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #E0E6ED; color: #7F8C8D; font-size: 12px;">
        SEBIT MCP 세션 분석 보고서 | 생성 시간: ${(0, dayjs_1.default)().format('YYYY-MM-DD HH:mm:ss')}
    </div>
</body>
</html>
    `;
    }
    // HTML을 PDF로 변환 (한글 지원)
    async generateSessionReport(sessionData, savePath, customAnalysis, claudeAnalysis, language = 'ko') {
        try {
            const htmlContent = this.generateHTML(sessionData, customAnalysis, claudeAnalysis, language);
            // Puppeteer를 사용하여 PDF 생성
            const puppeteer = require('puppeteer');
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            // PDF 옵션
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '1cm',
                    right: '1cm',
                    bottom: '1cm',
                    left: '1cm'
                }
            });
            await browser.close();
            // 파일 저장 (기본 경로 강제 적용)
            let finalSavePath;
            if (savePath && savePath.trim() !== '') {
                // 사용자가 명시적으로 경로를 지정한 경우만 사용
                finalSavePath = savePath;
                logger_1.Logger.info(`Using user-specified path: ${finalSavePath}`);
            }
            else {
                // 연도/월/일 폴더 구조로 정리
                const now = (0, dayjs_1.default)();
                const year = now.format('YYYY');
                const month = now.format('MM');
                const day = now.format('DD');
                finalSavePath = path_1.default.join(MultiLanguagePDFGenerator.DEFAULT_SAVE_PATH, year, month, day);
                logger_1.Logger.info(`Using date-structured path: ${finalSavePath}`);
            }
            await this.ensureDirectoryExists(finalSavePath);
            const fileName = `SEBIT-MCP-Report_${(0, dayjs_1.default)().format('YYYY-MM-DD_HH-mm-ss')}.pdf`;
            const fullPath = path_1.default.join(finalSavePath, fileName);
            await fs_extra_1.default.writeFile(fullPath, pdfBuffer);
            logger_1.Logger.info(`Korean session report generated successfully: ${fullPath}`);
            return fullPath;
        }
        catch (error) {
            logger_1.Logger.error('Failed to generate Korean PDF report', error);
            throw error;
        }
    }
}
exports.MultiLanguagePDFGenerator = MultiLanguagePDFGenerator;
