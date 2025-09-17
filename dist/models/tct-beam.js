"use strict";
// =============================
// FILE: src/models/tct-beam.ts
// SEBIT-TCTBEAM: Trigonometric Cost Tracking & Break-Even Analysis Model
// - 문서 수식(고정비/변동비 비율 → 각도 a, sin/cos/tan 가중, BE 계산) 충실 구현
// - 입력 유연: 연도별 배열 또는 5년 합계/올해 값만으로도 동작
// =============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTCTBEAM = runTCTBEAM;
// --------- helpers ---------
const EPS = 1e-9;
const nz = (x, d = 0) => (Number.isFinite(+x) ? +x : d);
const R = (x, step = 1e-6) => Number.isFinite(x) ? Math.round(x / step) * step : x;
const toRad = (deg) => (deg * Math.PI) / 180;
// -180~180 정규화 + tan 특이점 회피(±90° 근처)
const clampDeg = (deg) => {
    let d = ((deg + 180) % 360 + 360) % 360 - 180;
    if (Math.abs(d) >= 89.999)
        d = d > 0 ? 89.999 : -89.999;
    return d;
};
const sumLastN = (arr, n) => {
    if (!arr || !arr.length)
        return 0;
    const s = Math.max(0, arr.length - n);
    let tot = 0;
    for (let i = s; i < arr.length; i++)
        tot += nz(arr[i], 0);
    return tot;
};
const last = (arr) => arr && arr.length ? nz(arr[arr.length - 1], 0) : undefined;
// --------- 다국어 그래프 생성 ---------
const getGraphLabels = (lang) => {
    if (lang === 'en') {
        return {
            title: 'TCT-BEAM Analysis: Trigonometric Cost Tracking & Break-Even Analysis',
            subtitle: 'Fixed/Variable Cost Ratio Analysis with Angular Transformation',
            xAxisTitle: 'Angle (degrees)',
            yAxisTitle: 'Cost Amount',
            fixedCosts: 'Fixed Costs',
            variableCosts: 'Variable Costs',
            totalCosts: 'Total Costs',
            breakEvenPoint: 'Break-Even Point',
            currentAngle: 'Current Angle',
            targetZone: 'Target Zone',
            riskZone: 'Risk Zone',
            breakEvenLine: 'Break-Even Revenue',
            operatingProfit: 'Operating Profit',
            costStructure: 'Cost Structure'
        };
    }
    else {
        return {
            title: 'TCT-BEAM 분석: 삼각함수 비용추적 및 손익분기점 분석',
            subtitle: '고정비/변동비 비율의 각도 변환 분석',
            xAxisTitle: '각도 (도)',
            yAxisTitle: '비용 금액',
            fixedCosts: '고정비',
            variableCosts: '변동비',
            totalCosts: '총비용',
            breakEvenPoint: '손익분기점',
            currentAngle: '현재 각도',
            targetZone: '목표 구간',
            riskZone: '위험 구간',
            breakEvenLine: '손익분기 매출',
            operatingProfit: '영업이익',
            costStructure: '비용 구조'
        };
    }
};
// SVG 생성 함수들
const generateTrigonometricCircle = (output, labels) => {
    const radius = 150;
    const centerX = 200;
    const centerY = 200;
    const currentAngleRad = (output.thetaNowDeg * Math.PI) / 180;
    // 현재 각도의 sin, cos 값
    const sinValue = Math.sin(currentAngleRad);
    const cosValue = Math.cos(currentAngleRad);
    // 현재 각도 포인트
    const currentX = centerX + radius * cosValue;
    const currentY = centerY - radius * sinValue; // SVG에서 Y축은 뒤집힘
    return `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <!-- 배경 -->
      <rect width="400" height="400" fill="#f8f9fa"/>
      
      <!-- 격자선 -->
      <line x1="50" y1="${centerY}" x2="350" y2="${centerY}" stroke="#e0e0e0" stroke-width="1"/>
      <line x1="${centerX}" y1="50" x2="${centerX}" y2="350" stroke="#e0e0e0" stroke-width="1"/>
      
      <!-- 원 -->
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#333" stroke-width="2"/>
      
      <!-- 각도 구간 표시 -->
      <path d="M ${centerX} ${centerY} L ${centerX + radius} ${centerY} A ${radius} ${radius} 0 0 0 ${currentX} ${currentY} Z" 
            fill="#4ECDC4" fill-opacity="0.3" stroke="#4ECDC4" stroke-width="2"/>
      
      <!-- 현재 각도 선 -->
      <line x1="${centerX}" y1="${centerY}" x2="${currentX}" y2="${currentY}" 
            stroke="#FF9F43" stroke-width="3"/>
      
      <!-- Sin/Cos 투영선 -->
      <line x1="${currentX}" y1="${currentY}" x2="${currentX}" y2="${centerY}" 
            stroke="#FF6B6B" stroke-width="2" stroke-dasharray="5,5"/>
      <line x1="${currentX}" y1="${currentY}" x2="${centerX}" y2="${currentY}" 
            stroke="#4ECDC4" stroke-width="2" stroke-dasharray="5,5"/>
      
      <!-- 현재 포인트 -->
      <circle cx="${currentX}" cy="${currentY}" r="6" fill="#FF9F43"/>
      
      <!-- 레이블 -->
      <text x="${centerX}" y="30" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">
        ${labels.title}
      </text>
      <text x="${centerX}" y="45" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
        ${labels.currentAngle}: ${output.thetaNowDeg.toFixed(1)}°
      </text>
      
      <!-- 축 레이블 -->
      <text x="360" y="${centerY + 5}" font-family="Arial" font-size="12">cos (${labels.variableCosts})</text>
      <text x="${centerX - 5}" y="40" font-family="Arial" font-size="12">sin (${labels.fixedCosts})</text>
      
      <!-- 값 표시 -->
      <text x="20" y="370" font-family="Arial" font-size="11">
        sin(${output.thetaNowDeg.toFixed(1)}°) = ${sinValue.toFixed(3)}
      </text>
      <text x="20" y="385" font-family="Arial" font-size="11">
        cos(${output.thetaNowDeg.toFixed(1)}°) = ${cosValue.toFixed(3)}
      </text>
      
      <!-- 각도 표시 -->
      <text x="${centerX + 20}" y="${centerY - 10}" font-family="Arial" font-size="10" fill="#FF9F43">
        ${output.thetaNowDeg.toFixed(1)}°
      </text>
    </svg>
  `;
};
const generateCostChart = (output, labels) => {
    const width = 600;
    const height = 400;
    const margin = { top: 60, right: 40, bottom: 60, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    // 데이터 생성
    const angles = [];
    const fixedCosts = [];
    const variableCosts = [];
    const totalCosts = [];
    for (let angle = -180; angle <= 180; angle += 10) {
        const radians = (angle * Math.PI) / 180;
        const sinWeight = Math.abs(Math.sin(radians));
        const cosWeight = Math.abs(Math.cos(radians));
        angles.push(angle);
        fixedCosts.push(sinWeight * output.baseFixed);
        variableCosts.push(cosWeight * output.baseVar);
        totalCosts.push(sinWeight * output.baseFixed + cosWeight * output.baseVar);
    }
    const maxCost = Math.max(...totalCosts);
    const xScale = (angle) => margin.left + ((angle + 180) / 360) * chartWidth;
    const yScale = (cost) => margin.top + chartHeight - (cost / maxCost) * chartHeight;
    // 선 데이터 생성
    const fixedLine = angles.map((angle, i) => `${xScale(angle)},${yScale(fixedCosts[i])}`).join(' ');
    const varLine = angles.map((angle, i) => `${xScale(angle)},${yScale(variableCosts[i])}`).join(' ');
    const totalLine = angles.map((angle, i) => `${xScale(angle)},${yScale(totalCosts[i])}`).join(' ');
    // 현재 각도 위치
    const currentX = xScale(output.thetaNowDeg);
    const currentAngleRad = (output.thetaNowDeg * Math.PI) / 180;
    const currentFixed = Math.abs(Math.sin(currentAngleRad)) * output.baseFixed;
    const currentVar = Math.abs(Math.cos(currentAngleRad)) * output.baseVar;
    const currentTotal = currentFixed + currentVar;
    return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- 배경 -->
      <rect width="${width}" height="${height}" fill="#f8f9fa"/>
      
      <!-- 제목 -->
      <text x="${width / 2}" y="25" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">
        ${labels.costStructure}
      </text>
      <text x="${width / 2}" y="45" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
        ${labels.subtitle}
      </text>
      
      <!-- 격자선 -->
      ${Array.from({ length: 5 }, (_, i) => {
        const y = margin.top + (i * chartHeight / 4);
        return `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`;
    }).join('')}
      
      ${Array.from({ length: 9 }, (_, i) => {
        const x = margin.left + (i * chartWidth / 8);
        return `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}" stroke="#e0e0e0" stroke-width="1"/>`;
    }).join('')}
      
      <!-- 총비용 영역 -->
      <polygon points="${margin.left},${yScale(0)} ${totalLine} ${width - margin.right},${yScale(0)}" 
               fill="#45B7D1" fill-opacity="0.3"/>
      
      <!-- 선들 -->
      <polyline points="${fixedLine}" fill="none" stroke="#FF6B6B" stroke-width="3"/>
      <polyline points="${varLine}" fill="none" stroke="#4ECDC4" stroke-width="3"/>
      <polyline points="${totalLine}" fill="none" stroke="#45B7D1" stroke-width="3"/>
      
      <!-- 현재 각도 수직선 -->
      <line x1="${currentX}" y1="${margin.top}" x2="${currentX}" y2="${height - margin.bottom}" 
            stroke="#FF9F43" stroke-width="2" stroke-dasharray="5,5"/>
      
      <!-- 현재 값 포인트들 -->
      <circle cx="${currentX}" cy="${yScale(currentFixed)}" r="4" fill="#FF6B6B"/>
      <circle cx="${currentX}" cy="${yScale(currentVar)}" r="4" fill="#4ECDC4"/>
      <circle cx="${currentX}" cy="${yScale(currentTotal)}" r="5" fill="#45B7D1"/>
      
      <!-- 축 -->
      <line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" 
            stroke="#333" stroke-width="2"/>
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" 
            stroke="#333" stroke-width="2"/>
      
      <!-- X축 레이블 -->
      <text x="${width / 2}" y="${height - 20}" text-anchor="middle" font-family="Arial" font-size="12">
        ${labels.xAxisTitle}
      </text>
      ${[-180, -90, 0, 90, 180].map(angle => `
        <text x="${xScale(angle)}" y="${height - margin.bottom + 15}" text-anchor="middle" font-family="Arial" font-size="10">
          ${angle}°
        </text>
      `).join('')}
      
      <!-- Y축 레이블 -->
      <text x="20" y="${height / 2}" text-anchor="middle" font-family="Arial" font-size="12" 
            transform="rotate(-90, 20, ${height / 2})">
        ${labels.yAxisTitle}
      </text>
      
      <!-- 범례 -->
      <g transform="translate(${width - 180}, 80)">
        <rect x="0" y="0" width="160" height="90" fill="white" stroke="#ccc" stroke-width="1" rx="5"/>
        <line x1="10" y1="20" x2="30" y2="20" stroke="#FF6B6B" stroke-width="3"/>
        <text x="35" y="24" font-family="Arial" font-size="11">${labels.fixedCosts}</text>
        <line x1="10" y1="40" x2="30" y2="40" stroke="#4ECDC4" stroke-width="3"/>
        <text x="35" y="44" font-family="Arial" font-size="11">${labels.variableCosts}</text>
        <line x1="10" y1="60" x2="30" y2="60" stroke="#45B7D1" stroke-width="3"/>
        <text x="35" y="64" font-family="Arial" font-size="11">${labels.totalCosts}</text>
        <text x="80" y="15" font-family="Arial" font-size="10" text-anchor="middle">${labels.currentAngle}</text>
        <text x="80" y="30" font-family="Arial" font-size="12" text-anchor="middle" font-weight="bold">
          ${output.thetaNowDeg.toFixed(1)}°
        </text>
      </g>
    </svg>
  `;
};
const generateGraphData = (output, input, lang) => {
    const labels = getGraphLabels(lang);
    // 각도 범위 데이터 생성 (-180 ~ 180도)
    const angleRange = [];
    const fixedCostData = [];
    const variableCostData = [];
    const totalCostData = [];
    for (let angle = -180; angle <= 180; angle += 5) {
        const radians = (angle * Math.PI) / 180;
        const sinWeight = Math.abs(Math.sin(radians));
        const cosWeight = Math.abs(Math.cos(radians));
        const adjustedFixed = sinWeight * output.baseFixed;
        const adjustedVariable = cosWeight * output.baseVar;
        const totalCost = adjustedFixed + adjustedVariable;
        angleRange.push({ x: angle, y: 0 });
        fixedCostData.push({ x: angle, y: adjustedFixed });
        variableCostData.push({ x: angle, y: adjustedVariable });
        totalCostData.push({ x: angle, y: totalCost });
    }
    return {
        chartConfig: {
            title: labels.title,
            subtitle: labels.subtitle,
            xAxis: { title: labels.xAxisTitle },
            yAxis: { title: labels.yAxisTitle },
            series: [
                {
                    name: labels.fixedCosts,
                    data: fixedCostData,
                    color: '#FF6B6B',
                    type: 'line'
                },
                {
                    name: labels.variableCosts,
                    data: variableCostData,
                    color: '#4ECDC4',
                    type: 'line'
                },
                {
                    name: labels.totalCosts,
                    data: totalCostData,
                    color: '#45B7D1',
                    type: 'area'
                }
            ],
            annotations: [
                {
                    type: 'line',
                    value: output.thetaNowDeg,
                    label: `${labels.currentAngle}: ${output.thetaNowDeg.toFixed(2)}°`,
                    color: '#FF9F43'
                },
                {
                    type: 'line',
                    value: output.breakEvenRevenue,
                    label: `${labels.breakEvenLine}: ${output.breakEvenRevenue.toFixed(0)}`,
                    color: '#26DE81'
                },
                {
                    type: 'zone',
                    value: 90,
                    label: labels.riskZone,
                    color: '#FF6B6B'
                },
                {
                    type: 'zone',
                    value: -90,
                    label: labels.riskZone,
                    color: '#FF6B6B'
                }
            ]
        },
        labels: {
            fixedCosts: labels.fixedCosts,
            variableCosts: labels.variableCosts,
            totalCosts: labels.totalCosts,
            breakEvenPoint: labels.breakEvenPoint,
            currentAngle: labels.currentAngle,
            targetZone: labels.targetZone,
            riskZone: labels.riskZone
        },
        svgChart: generateCostChart(output, labels),
        trigonometricCircle: generateTrigonometricCircle(output, labels)
    };
};
// --------- main ---------
function runTCTBEAM(input) {
    const startTime = Date.now();
    const step = nz(input.options?.roundStep, 1e-6);
    const lang = input.options?.language || 'ko';
    const includeGraph = input.options?.includeGraph || false;
    const comments = [];
    let inputValidation = true;
    // === Step1: 5년 합산 ===
    const sumFixed5 = input.fixedCosts && input.fixedCosts.length
        ? sumLastN(input.fixedCosts, 5)
        : nz(input.fixedCostTotal5y, 0);
    const sumVar5 = input.variableCosts && input.variableCosts.length
        ? sumLastN(input.variableCosts, 5)
        : nz(input.variableCostTotal5y, 0);
    const totalCost5 = Math.max(sumFixed5 + sumVar5, EPS);
    const fixedRatio5 = sumFixed5 / totalCost5;
    const varRatio5 = sumVar5 / totalCost5;
    // === Step2-1: 전년 대비 비율 변화량 ===
    let yoyDeltaFixedRatio;
    let yoyDeltaVarRatio;
    const prevFixedFromArr = input.fixedCosts && input.fixedCosts.length >= 2
        ? nz(input.fixedCosts[input.fixedCosts.length - 2], 0)
        : undefined;
    const currFixedFromArr = last(input.fixedCosts);
    const prevVarFromArr = input.variableCosts && input.variableCosts.length >= 2
        ? nz(input.variableCosts[input.variableCosts.length - 2], 0)
        : undefined;
    const currVarFromArr = last(input.variableCosts);
    if (prevFixedFromArr !== undefined &&
        currFixedFromArr !== undefined &&
        prevVarFromArr !== undefined &&
        currVarFromArr !== undefined) {
        const prevTot = Math.max(prevFixedFromArr + prevVarFromArr, EPS);
        const currTot = Math.max(currFixedFromArr + currVarFromArr, EPS);
        const prevFr = prevFixedFromArr / prevTot;
        const currFr = currFixedFromArr / currTot;
        const prevVr = prevVarFromArr / prevTot;
        const currVr = currVarFromArr / currTot;
        yoyDeltaFixedRatio = currFr - prevFr;
        yoyDeltaVarRatio = currVr - prevVr; // (이론상 -yoyDeltaFixedRatio)
    }
    else if (input.fixedRatioPrevYear !== undefined &&
        input.fixedRatioThisYear !== undefined) {
        const prevFr = nz(input.fixedRatioPrevYear, 0);
        const currFr = nz(input.fixedRatioThisYear, 0);
        yoyDeltaFixedRatio = currFr - prevFr;
        yoyDeltaVarRatio =
            input.variableRatioPrevYear !== undefined &&
                input.variableRatioThisYear !== undefined
                ? nz(input.variableRatioThisYear, 0) - nz(input.variableRatioPrevYear, 0)
                : -yoyDeltaFixedRatio;
    }
    // === Step3: a(각 변화율→각도), 누적 각도 ===
    const thetaPrevDeg = nz(input.prevAccumAngle, 0);
    const deltaThetaDeg = input.deltaAngleThisYear !== undefined
        ? nz(input.deltaAngleThisYear, 0)
        : nz(yoyDeltaVarRatio, 0) * 180;
    const thetaNowDeg = clampDeg(thetaPrevDeg + deltaThetaDeg);
    const tanTheta = Math.tan(toRad(thetaNowDeg));
    // === 올해 기준치(고정/변동) ===
    const baseFixed = currFixedFromArr ??
        nz(input.currentYearFixed, 0) ??
        (input.fixedCostTotal5y ? nz(input.fixedCostTotal5y, 0) / 5 : 0);
    const baseVar = currVarFromArr ??
        nz(input.currentYearVariable, 0) ??
        (input.variableCostTotal5y ? nz(input.variableCostTotal5y, 0) / 5 : 0);
    // 삼각 가중치 (문서: 고정비→sin, 변동비→cos, 비음수 가중)
    const fixedAdj = Math.abs(Math.sin(toRad(thetaNowDeg))) * baseFixed;
    const varAdj = Math.abs(Math.cos(toRad(thetaNowDeg))) * baseVar;
    const totalCostThisYear = fixedAdj + varAdj;
    // 수익/손익
    const revenueThisYear = input.currentRevenue !== undefined
        ? nz(input.currentRevenue, 0)
        : baseFixed + baseVar; // 보수 가정
    const operatingProfit = revenueThisYear * tanTheta;
    // 손익분기점 (BE = 고정비 / (1 - 변동비율))
    const currTotal = Math.max(baseFixed + baseVar, EPS);
    const varRatioThisYear = input.variableRatioThisYear !== undefined
        ? nz(input.variableRatioThisYear, 0)
        : baseVar / currTotal;
    const breakEvenRevenue = 1 - varRatioThisYear > EPS
        ? baseFixed / (1 - varRatioThisYear)
        : Infinity;
    // 플래그
    const flags = {
        near90Singularity: Math.abs(Math.abs(thetaNowDeg) - 90) < 0.1,
        crossed180: Math.sign(thetaPrevDeg) !== Math.sign(thetaNowDeg) &&
            Math.abs(thetaPrevDeg - thetaNowDeg) > 179.0,
        breakEvenZone: Math.abs(operatingProfit) < 1e-6,
    };
    // === 입력 검증 ===
    if (!input.fixedCosts && !input.fixedCostTotal5y) {
        inputValidation = false;
        comments.push("No fixed cost data provided");
    }
    if (!input.variableCosts && !input.variableCostTotal5y) {
        inputValidation = false;
        comments.push("No variable cost data provided");
    }
    if (Math.abs(thetaNowDeg) > 89) {
        comments.push("Angle approaching singularity zone");
    }
    // === 반환(반올림 적용) ===
    const processingTime = Date.now() - startTime;
    const baseOutput = {
        model: 'TCT-BEAM',
        timestamp: new Date().toISOString(),
        status: 'success',
        language: lang,
        sumFixed5: R(sumFixed5, step),
        sumVar5: R(sumVar5, step),
        totalCost5: R(totalCost5, step),
        fixedRatio5: R(fixedRatio5, step),
        varRatio5: R(varRatio5, step),
        yoyDeltaFixedRatio: yoyDeltaFixedRatio !== undefined ? R(yoyDeltaFixedRatio, step) : undefined,
        yoyDeltaVarRatio: yoyDeltaVarRatio !== undefined ? R(yoyDeltaVarRatio, step) : undefined,
        thetaPrevDeg: R(thetaPrevDeg, step),
        deltaThetaDeg: R(deltaThetaDeg, step),
        thetaNowDeg: R(thetaNowDeg, step),
        tanTheta: R(tanTheta, step),
        baseFixed: R(baseFixed, step),
        baseVar: R(baseVar, step),
        adjustedVar: R(varAdj, step),
        totalCostThisYear: R(totalCostThisYear, step),
        revenueThisYear: R(revenueThisYear, step),
        operatingProfit: R(operatingProfit, step),
        breakEvenRevenue: R(breakEvenRevenue, step),
        flags,
        metadata: {
            processingTime,
            inputValidation,
            comments
        }
    };
    // 그래프 데이터 추가 (요청 시)
    if (includeGraph) {
        const graphData = generateGraphData(baseOutput, input, lang);
        // SVG 파일 내보내기 (기본 경로 강제 설정)
        if (includeGraph) {
            try {
                const fs = require('fs');
                const path = require('path');
                // PDF와 같은 날짜 폴더 안에 graphs 폴더: SEBIT-MCP-Reports/연도/월/일/graphs
                const DEFAULT_TCT_PATH = 'C:\\Users\\user\\Documents\\SEBIT-MCP-Reports';
                let baseExportDir;
                let baseName;
                if (input.options?.exportPath && input.options.exportPath.trim() !== '') {
                    // 사용자가 명시적으로 경로를 지정한 경우
                    baseExportDir = path.dirname(input.options.exportPath);
                    baseName = path.basename(input.options.exportPath, path.extname(input.options.exportPath));
                }
                else {
                    // 기본 경로 사용
                    baseExportDir = DEFAULT_TCT_PATH;
                    baseName = 'TCT-BEAM_Analysis';
                }
                // 연도/월/일/graphs 폴더 구조 생성
                const now = new Date();
                const year = now.getFullYear().toString();
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const day = now.getDate().toString().padStart(2, '0');
                const timeStamp = now.toTimeString().slice(0, 8).replace(/:/g, '-');
                // 연도/월/일/graphs/시간 폴더 구조
                const yearFolder = path.join(baseExportDir, year);
                const monthFolder = path.join(yearFolder, month);
                const dayFolder = path.join(monthFolder, day);
                const graphsFolder = path.join(dayFolder, 'graphs');
                const timestampFolder = path.join(graphsFolder, `TCT-BEAM_${timeStamp}`);
                // 폴더 생성 (없는 경우)
                if (!fs.existsSync(timestampFolder)) {
                    fs.mkdirSync(timestampFolder, { recursive: true });
                }
                // 분석 정보를 포함한 메타데이터 파일 생성
                const metadata = {
                    generatedAt: now.toISOString(),
                    language: lang,
                    analysis: {
                        currentAngle: baseOutput.thetaNowDeg,
                        fixedCosts: baseOutput.baseFixed,
                        variableCosts: baseOutput.baseVar,
                        totalCosts: baseOutput.totalCostThisYear,
                        breakEvenRevenue: baseOutput.breakEvenRevenue,
                        operatingProfit: baseOutput.operatingProfit,
                        fixedRatio: baseOutput.fixedRatio5,
                        variableRatio: baseOutput.varRatio5
                    },
                    flags: baseOutput.flags,
                    inputData: {
                        fixedCosts: input.fixedCosts,
                        variableCosts: input.variableCosts,
                        currentRevenue: input.currentRevenue
                    }
                };
                const metadataPath = path.join(timestampFolder, 'analysis_metadata.json');
                fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
                // 차트 파일들 저장
                const costChartPath = path.join(timestampFolder, `${baseName}_cost_chart.svg`);
                const trigCirclePath = path.join(timestampFolder, `${baseName}_trigonometric_circle.svg`);
                const dashboardPath = path.join(timestampFolder, `${baseName}_dashboard.svg`);
                fs.writeFileSync(costChartPath, graphData.svgChart);
                fs.writeFileSync(trigCirclePath, graphData.trigonometricCircle);
                // 결합된 대시보드 SVG 생성
                const combinedSvg = `
          <svg width="1000" height="800" xmlns="http://www.w3.org/2000/svg">
            <rect width="1000" height="800" fill="#f8f9fa"/>
            
            <!-- 제목 -->
            <text x="500" y="30" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold">
              ${getGraphLabels(lang).title}
            </text>
            <text x="500" y="50" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">
              Generated: ${now.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US')}
            </text>
            
            <!-- 삼각함수 원 (왼쪽) -->
            <g transform="translate(0, 80)">
              ${graphData.trigonometricCircle.replace('<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">', '').replace('</svg>', '')}
            </g>
            
            <!-- 비용 차트 (오른쪽) -->
            <g transform="translate(400, 80)">
              ${graphData.svgChart.replace('<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">', '').replace('</svg>', '')}
            </g>
            
            <!-- 요약 정보 -->
            <g transform="translate(50, 520)">
              <rect x="0" y="0" width="900" height="220" fill="white" stroke="#ccc" stroke-width="1" rx="10"/>
              <text x="20" y="30" font-family="Arial" font-size="16" font-weight="bold">${lang === 'ko' ? '분석 결과 요약' : 'Analysis Summary'}</text>
              
              <text x="30" y="60" font-family="Arial" font-size="12">${lang === 'ko' ? '현재 각도' : 'Current Angle'}: ${baseOutput.thetaNowDeg.toFixed(2)}°</text>
              <text x="30" y="80" font-family="Arial" font-size="12">${lang === 'ko' ? '고정비' : 'Fixed Costs'}: ${baseOutput.baseFixed.toLocaleString()}</text>
              <text x="30" y="100" font-family="Arial" font-size="12">${lang === 'ko' ? '변동비' : 'Variable Costs'}: ${baseOutput.baseVar.toLocaleString()}</text>
              <text x="30" y="120" font-family="Arial" font-size="12">${lang === 'ko' ? '손익분기매출' : 'Break-even Revenue'}: ${baseOutput.breakEvenRevenue.toLocaleString()}</text>
              
              <text x="400" y="60" font-family="Arial" font-size="12">${lang === 'ko' ? '영업이익' : 'Operating Profit'}: ${baseOutput.operatingProfit.toLocaleString()}</text>
              <text x="400" y="80" font-family="Arial" font-size="12">${lang === 'ko' ? '5년 고정비 합계' : '5-Year Fixed Total'}: ${baseOutput.sumFixed5.toLocaleString()}</text>
              <text x="400" y="100" font-family="Arial" font-size="12">${lang === 'ko' ? '5년 변동비 합계' : '5-Year Variable Total'}: ${baseOutput.sumVar5.toLocaleString()}</text>
              <text x="400" y="120" font-family="Arial" font-size="12">${lang === 'ko' ? '고정비 비율' : 'Fixed Ratio'}: ${(baseOutput.fixedRatio5 * 100).toFixed(1)}%</text>
              
              <!-- 위험 플래그 -->
              ${baseOutput.flags.near90Singularity ? `<text x="30" y="160" font-family="Arial" font-size="12" fill="#FF6B6B">⚠ ${lang === 'ko' ? '90도 특이점 근처' : 'Near 90° Singularity'}</text>` : ''}
              ${baseOutput.flags.crossed180 ? `<text x="30" y="180" font-family="Arial" font-size="12" fill="#FF9F43">⚠ ${lang === 'ko' ? '180도 교차' : 'Crossed 180°'}</text>` : ''}
              ${baseOutput.flags.breakEvenZone ? `<text x="30" y="200" font-family="Arial" font-size="12" fill="#26DE81">✓ ${lang === 'ko' ? '손익분기점 근처' : 'Near Break-even'}</text>` : ''}
            </g>
            
            <!-- 폴더 정보 -->
            <text x="500" y="790" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">
              Saved in: ${timestampFolder}
            </text>
          </svg>
        `;
                fs.writeFileSync(dashboardPath, combinedSvg);
                // README 파일 생성
                const readmeContent = `# TCT-BEAM Analysis Report
Generated: ${now.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US')}
Language: ${lang === 'ko' ? '한국어' : 'English'}

## Files in this directory:
- \`${baseName}_dashboard.svg\` - Complete analysis dashboard
- \`${baseName}_cost_chart.svg\` - Cost structure chart
- \`${baseName}_trigonometric_circle.svg\` - Trigonometric circle visualization
- \`analysis_metadata.json\` - Analysis data and metadata
- \`README.md\` - This file

## Analysis Summary:
- Current Angle: ${baseOutput.thetaNowDeg.toFixed(2)}°
- Fixed Costs: ${baseOutput.baseFixed.toLocaleString()}
- Variable Costs: ${baseOutput.baseVar.toLocaleString()}
- Break-even Revenue: ${baseOutput.breakEvenRevenue.toLocaleString()}
- Operating Profit: ${baseOutput.operatingProfit.toLocaleString()}

## Risk Flags:
${baseOutput.flags.near90Singularity ? '⚠ Near 90° Singularity' : ''}
${baseOutput.flags.crossed180 ? '⚠ Crossed 180°' : ''}
${baseOutput.flags.breakEvenZone ? '✓ Near Break-even Zone' : ''}
`;
                const readmePath = path.join(timestampFolder, 'README.md');
                fs.writeFileSync(readmePath, readmeContent);
                baseOutput.exportInfo = {
                    folderPath: timestampFolder,
                    files: [
                        `${baseName}_dashboard.svg`,
                        `${baseName}_cost_chart.svg`,
                        `${baseName}_trigonometric_circle.svg`,
                        'analysis_metadata.json',
                        'README.md'
                    ],
                    success: true
                };
                const pathInfo = input.options?.exportPath ? `user-specified path: ${baseExportDir}` : `default path: ${DEFAULT_TCT_PATH}`;
                baseOutput.metadata.comments.push(`Files exported to: ${timestampFolder} (using ${pathInfo})`);
            }
            catch (error) {
                baseOutput.exportInfo = {
                    folderPath: '',
                    files: [],
                    success: false
                };
                baseOutput.metadata.comments.push(`Export failed: ${error}`);
                baseOutput.status = 'error';
            }
        }
        return {
            ...baseOutput,
            graphData,
        };
    }
    return baseOutput;
}
