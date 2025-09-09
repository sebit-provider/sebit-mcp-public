# SEBIT-MCP Models

회계/재무 특화 도메인 프레임워크(MCP), **SEBIT (Systematic Engineered Binancial Intelligence & Tactics)** 모델 집합입니다.  
총 12개의 핵심 모델로 구성되어 있으며, 각 모델은 고유의 입력값(JSON)과 계산 로직을 기반으로 동작합니다.

---

## 🚀 설치 및 실행
```bash
git clone https://github.com/sebit-provider/sebit-mcp-public.git
cd sebit-mcp-public
npm install sebit-mcp-public
node dist/mcp-server.js
```

## 클로드 및 기타 클라이언트 등록예시(클로드 Desktop과 같은 프로그램에서 등록)
해당 프레임워크는 MCP기반이며 클로드 설정→데스크톱 앱→개발자→구성편집→claude_desktop_config.json에서 아래와 같이 경로를 설정 후 저장하여 클로드를 재시작하면 사용할 수 있습니다.
(단 아래는 단순 예시로 경로설정은 MCP가 깔린 파일로 세팅하여 mcp-server.js를 잡아주시면 됩니다.)
```Jsonc
{
  "mcpServers": {
    "sebit-mcp": {
      "command": "node",
      "args": ["C:/Users/user/sebit-mcp-public/dist/mcp-server.js"],
      "cwd": "C:/Users/user/sebit-mcp-public"
    }
  }
}

```
---

# 📊 모델별 설명

## 1. DDA (Dynamic Depreciation Algorithm) | 동적 감가상각
**설명 (KR):** 자산의 시간·사용량·시장 민감도를 반영하여 동적으로 감가상각을 산출합니다.  
**Description (EN):** Calculates depreciation dynamically, factoring in time, usage, and market sensitivity.

### 🔹 Input 예제
```json
{
  "acquisitionCost": 100000,
  "residualValue": 10000,
  "usefulLifeYears": 5,
  "elapsedUseDays": 30,
  "periodUseDays": 60,
  "baselineUseHours": 100,
  "totalUseHours": 105,
  "beta": 0.3,
  "psPrev": 120,
  "psCurr": 108
}
```

### 🔹 결과 (요약)
- 일일 감가상각비(Daily Depreciation) 계산  
- 사용량 초과/부족에 따른 조정치 반영  
- 시장 가격 변동률(r) + β 민감도 반영  
- 손상검사/재평가(임계치 및 cap) 적용

---

## 2. LAM (Lease Asset Model) | 리스 자산평가
**설명 (KR):** 리스 자산의 비용·이자율·사용일수를 반영하여 리스 부채 및 사용권 자산을 평가합니다.  
**Description (EN):** Evaluates lease liabilities and right-of-use assets considering cost, rate, and usage.

### 🔹 Input 예제
```json
{
  "acquisitionCost": 5000000,
  "residualValue": 200000,
  "leaseTermYears": 3,
  "daysUsedThisPeriod": 180,
  "totalDays": 365,
  "discountRate": 0.06
}
```

### 🔹 결과 (요약)
- 현재가치(PV)로 리스 부채 평가  
- 기간 사용일수 기반 감가상각 계산  
- 잔존가치 및 미사용일수 조정

---

## 3. RVM (Resource Valuation Model) | 자원가치 평가
**설명 (KR):** 누적/기간별 채굴량과 가격을 반영하여 자원의 가치를 평가합니다.  
**Description (EN):** Values resources using cumulative and current mining data with market adjustments.

### 🔹 Input 예제
```json
{
  "cumulativeMiningDays": 300,
  "cumulativeMinedValue": 1500,
  "currentPeriodMiningDays": 30,
  "currentPeriodMinedValue": 100,
  "currentResourcePrice": 50,
  "prevYearValuation": 1200,
  "currentValuation": 1350
}
```

### 🔹 결과 (요약)
- 누적 및 기간 채굴량 기반 가치 산정  
- 시장가격 변화율 r, β 민감도 반영  
- 자원 평가액의 전년 대비 변화 분석

---

## 4. CEEM (Consumable Expense Estimation Model) | 소모성 비용 측정
**설명 (KR):** 자산/소모품의 누적 사용량과 단가를 기반으로 비용을 추정합니다.  
**Description (EN):** Estimates consumable expenses based on cumulative usage and unit costs.

### 🔹 Input 예제
```json
{
  "cumulativeUsage": 1200,
  "unitCost": 15,
  "periodDays": 30,
  "totalUsage": 300,
  "prevYearR": 0.08,
  "beta": 0.9,
  "years": 3
}
```

### 🔹 결과 (요약)
- 단가 × 사용량 기반 비용 추정  
- 전년도 성장률(r)과 β 민감도 반영  
- 기간별 비용 합산으로 손익 반영

---

## 5. BDM (Bond Discounting Model) | 사채 평가
**설명 (KR):** 발행가, 할인율, 경과일수를 반영하여 사채의 현재가치를 평가합니다.  
**Description (EN):** Discounts bonds to present value considering issue amount, elapsed days, and discount rate.

### 🔹 Input 예제
```json
{
  "issueAmount": 1000000,
  "scheduleDays": 365,
  "elapsedDays": 90,
  "prevMeasuredValue": 980000,
  "discountRate": 0.05
}
```

### 🔹 결과 (요약)
- 경과일수 기준 현재가치 산출  
- 할인율·β 반영해 평가액 조정  
- 전기 측정값 대비 변동 추적

---

## 6. BELM (Bad debt Expected Loss Model) | 대손회계
**설명 (KR):** 거래처별 상환액, 포트폴리오 비중, 이자율을 반영하여 대손 가능성을 평가합니다.  
**Description (EN):** Estimates expected loss rate (ELR) using settlements, exposures, and interest rates.

### 🔹 Input 예제
```json
{
  "dailyExpectedSettlement": 2000,
  "usefulLifeYears": 5,
  "elapsedDays": 400,
  "actualSettlementToDate": 700000,
  "interestRate": 0.06,
  "clientExposure": 100000,
  "totalExposure": 1000000
}
```

### 🔹 결과 (요약)
- 일일 예상 상환액 대비 실제 상환액 비교  
- 포트폴리오 비중, 전년도 상환액 가중  
- 최종 ELR 산출 후 0~1 범위 클램프

---

## 7. CPRM (Convertible Bond Risk Model) | 전환사채
**설명 (KR):** 전환사채의 기본율, 대손, PD, 거래량, 회수율을 종합하여 위험도를 산정합니다.  
**Description (EN):** Calculates convertible bond risk based on base rate, bad debts, PD, volumes, and recoveries.

### 🔹 Input 예제
```json
{
  "baseRate": 0.02,
  "badDebtIncidence": 0.01,
  "assumedDefaultRate": 0.03,
  "bondUnitPrice": 1000,
  "bondVolume": 500,
  "pastDebtorRecovery": 200,
  "bondTurnoverPct": 0.5,
  "stockTurnoverPct": 0.8,
  "extraAdj": -0.005,
  "maxValue": 0.35
}
```

### 🔹 결과 (요약)
- 기본율 + 대손/PD 반영  
- 거래량·회수율 조정  
- cap·공제율 적용 최종 위험도 산출

---

## 8. OCIM (Other Comprehensive Income Model) | 기타포괄손익 복리형
**설명 (KR):** OCI 계정 비중, 기간별 OCI 변동, 민감도, 조정률을 반영한 복리 누적 평가.  
**Description (EN):** Compounds OCI considering account shares, period flows, sensitivity, and adjustments.

### 🔹 Input 예제
```json
{
  "accountOCIAmount": 20000,
  "totalOCIAllItems": 100000,
  "openingOCIBalance": 50000,
  "currentPeriodOCI": 7000,
  "marketChangeR": 0.05,
  "beta": 1.2,
  "horizonYears": 3
}
```

### 🔹 결과 (요약)
- 계정별 OCI 비중 산정  
- 기초·당기 OCI 합산 후 복리 반영  
- 민감도 및 조정률 기반 재평가

---

## 9. FAREX (Foreign Exchange Adjustment Model) | 외환 조정
**설명 (KR):** 수출입 데이터를 기반으로 환율 민감도를 조정하고 실질환율을 평가합니다.  
**Description (EN):** Adjusts FX based on export/import data and computes effective exchange rate.

### 🔹 Input 예제
```json
{
  "prevYear_export_curr": 1000,
  "prevYear_import_curr": 800,
  "currYear_export_curr": 1200,
  "currYear_import_curr": 900,
  "currentExchangeRate": 1320
}
```

### 🔹 결과 (요약)
- 전년/금년 수출입 데이터 기반 무역격차 산출  
- 환율 민감도(β, 가중치) 적용  
- 실질환율 산정

---

## 10. TCT-BEAM (Trigonometric Cost Tracking & BE Analysis Model) | 삼각함수 기반 원가 추적
**설명 (KR):** 고정비·변동비를 삼각함수 각도로 변환하여 수익 민감도와 BEP를 평가합니다.  
**Description (EN):** Uses trigonometric angles of fixed/variable costs to analyze revenue sensitivity and break-even.

### 🔹 Input 예제
```json
{
  "fixedCosts": [100, 120, 130],
  "variableCosts": [200, 220, 250],
  "currentRevenue": 500
}
```

### 🔹 결과 (요약)
- 고정비·변동비 → 각도 변환  
- 매출 대비 손익분기점(BEP) 추정  
- 수익 민감도 분석

---

## 11. CPMRV (Crypto Market Real Value) | 가상화폐 실질가치
**설명 (KR):** 전년도 대비 성장/하락률과 현재 시가를 반영하여 가상화폐 실질가치를 산출합니다.  
**Description (EN):** Evaluates cryptocurrency fair value using past growth/decline rates and current market value.

### 🔹 Input 예제
```json
{
  "previousYearGrowthRate": 0.24,
  "previousYearDeclineRate": 0.12,
  "currentYearGrowthYTD": 0.08,
  "currentCryptocurrencyValue": 35000
}
```

### 🔹 결과 (요약)
- 전년 성장·하락률 반영  
- YTD 성장률 기반 조정  
- 실질가치 계산

---

## 12. DCBPRA (Dynamic CAPM-Based Pricing Risk Adjustment) | 자본자산 가격결정 조정
**설명 (KR):** CAPM에 성장률 보정을 결합하여 동적 위험 프리미엄을 평가합니다.  
**Description (EN):** Adjusts CAPM pricing with real growth rates to dynamically evaluate risk premium.

### 🔹 Input 예제
```json
{
  "riskFreeRate": 0.02,
  "marketReturn": 0.08,
  "beta": 1.1,
  "RS": 0.9,
  "realGrowthPct": 0.045
}
```

### 🔹 결과 (요약)
- CAPM 수식 기반 기대수익 계산  
- RS 및 성장률 보정 반영  
- 최종 위험조정 수익률 산출

---

# 📌 유의사항
- 모든 Input은 JSON 형식으로 제공됩니다.  
- 숫자형 변수는 문자열 입력도 허용(`"8%"`, `"0.08"`)  
- 옵션 필드(`options`)는 선택적으로 사용 가능합니다.  
- 자세한 인풋 json에 대해서는 해당 프로젝트 루트안에 있는 SEBIT_FRAMEWORK_INPUT_VALUABLES.docx를 참고하세요.

---

# 🧾 라이선스 & 기안자
- License: MIT  
- 기안자: 박승협 (Seounghyup Park)  
