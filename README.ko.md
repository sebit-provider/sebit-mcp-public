# SEBIT-MCP Models (Korean) 🇰🇷

> if you want to read in English, click the link below.  
> 👉 [README.md](./README.md)

[![License: SPL-1.0](https://img.shields.io/badge/License-SPL--1.0-blue.svg)](./LICENSE)
[![npm version](https://img.shields.io/npm/v/sebit-mcp-public)](https://www.npmjs.com/package/sebit-mcp-public)  
[![npm downloads](https://img.shields.io/npm/dt/sebit-mcp-public)](https://www.npmjs.com/package/sebit-mcp-public)  
[![GitHub stars](https://img.shields.io/github/stars/sebit-provider/sebit-mcp-public?style=social)](https://github.com/sebit-provider/sebit-mcp-public/stargazers)  
[![GitHub issues](https://img.shields.io/github/issues/sebit-provider/sebit-mcp-public)](https://github.com/sebit-provider/sebit-mcp-public/issues)  
[![Last commit](https://img.shields.io/github/last-commit/sebit-provider/sebit-mcp-public)](https://github.com/sebit-provider/sebit-mcp-public/commits/main)


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
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["C:\\Users\\user\\sebit-mcp-public\\dist\\mcp-server.js"],
      "cwd": "C:\\Users\\user\\sebit-mcp-public",
      "optional": true
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
  "acquisitionCost": 1200000,
  "residualValue": 200000,
  "usefulLifeYears": 5,
  "elapsedUseDays": 730,
  "periodUseDays": 180,
  "baselineUseHours": 2000,
  "totalUseHours": 2300,
  "beta": 0.4,
  "psPrev": 115,
  "psCurr": 108,
  "marketChangeR": 0.03
}
```

### 🔹 결과 (요약)
- 일일 감가상각비(Daily Depreciation) 계산  
- 사용량 초과/부족에 따른 조정치 반영  
- 시장 가격 변동률(r) + β 민감도 반영  
- 손상검사/재평가(임계치 및 cap) 적용

### 관련조문 (IFRS)
- IFRS 16 유형자산, IAS 36 자산손상 (→ 사용패턴에 따른 감가상각, 자산손상 발생 시 처리)

---

## 2. LAM (Lease Asset Model) | 리스 자산평가
**설명 (KR):** 리스 자산의 비용·이자율·사용일수를 반영하여 리스 부채 및 사용권 자산을 평가합니다.  
**Description (EN):** Evaluates lease liabilities and right-of-use assets considering cost, rate, and usage.

### 🔹 Input 예제
```json
{
  "acquisitionCost": 8000000,
  "residualValue": 300000,
  "leaseTermYears": 4,
  "daysUsedThisPeriod": 120,
  "totalDays": 1460,
  "discountRate": 0.055
}
```

### 🔹 결과 (요약)
- 현재가치(PV)로 리스 부채 평가  
- 기간 사용일수 기반 감가상각 계산  
- 잔존가치 및 미사용일수 조정

### 관련조문 (IFRS)
- IFRS 16.23~28,16.29~35 리스 (→ 사용권 자산(ROU 자산), 리스부채의 측정, 상각 및 할인율 적용 관련)

---

## 3. RVM (Resource Valuation Model) | 자원가치 평가
**설명 (KR):** 누적/기간별 채굴량과 가격을 반영하여 자원의 가치를 평가합니다.  
**Description (EN):** Values resources using cumulative and current mining data with market adjustments.

### 🔹 Input 예제
```json
{
  "cumulativeMiningDays": 1500,
  "cumulativeMinedValue": 75000,
  "currentPeriodMiningDays": 90,
  "currentPeriodMinedValue": 5600,
  "currentResourcePrice": 52,
  "prevYearValuation": 68000,
  "currentValuation": 73000
}
```

### 🔹 결과 (요약)
- 누적 및 기간 채굴량 기반 가치 산정  
- 시장가격 변화율 r, β 민감도 반영  
- 자원 평가액의 전년 대비 변화 분석

### 관련조문 (IFRS)
- IFRS 6 탐사 및 평가 자산 (Exploration for and Evaluation of Mineral Resources)
- IAS 16 유형자산 (→ 자원 탐사·개발단계에서 발생하는 원가의 인식 및 자산화 기준)

---

## 4. CEEM (Consumable Expense Estimation Model) | 소모성 비용 측정
**설명 (KR):** 자산/소모품의 누적 사용량과 단가를 기반으로 비용을 추정합니다.  
**Description (EN):** Estimates consumable expenses based on cumulative usage and unit costs.

### 🔹 Input 예제
```json
{
  "cumulativeUsage": 15000,
  "unitCost": 18.5,
  "periodDays": 90,
  "totalUsage": 1400,
  "prevYearR": 0.06,
  "beta": 0.8,
  "years": 2
}
```

### 🔹 결과 (요약)
- 단가 × 사용량 기반 비용 추정  
- 전년도 성장률(r)과 β 민감도 반영  
- 기간별 비용 합산으로 손익 반영

### 관련조문 (IFRS)
- IAS 2 재고(Inventories)
- IAS 16 유형자산 (→ 소모품 성격 유지보수비 처리)

---

## 5. BDM (Bond Discounting Model) | 사채 평가
**설명 (KR):** 발행가, 할인율, 경과일수를 반영하여 사채의 현재가치를 평가합니다.  
**Description (EN):** Discounts bonds to present value considering issue amount, elapsed days, and discount rate.

### 🔹 Input 예제
```json
{
  "issueAmount": 50000000,
  "scheduleDays": 1825,
  "elapsedDays": 365,
  "prevMeasuredValue": 48200000,
  "discountRate": 0.047
}
```

### 🔹 결과 (요약)
- 경과일수 기준 현재가치 산출  
- 할인율·β 반영해 평가액 조정  
- 전기 측정값 대비 변동 추적

### 관련조문 (IFRS)
- IFRS 9 금융상품 (부채측정, 상각후원가)

---

## 6. BELM (Bad debt Expected Loss Model) | 대손회계
**설명 (KR):** 거래처별 상환액, 포트폴리오 비중, 이자율을 반영하여 대손 가능성을 평가합니다.  
**Description (EN):** Estimates expected loss rate (ELR) using settlements, exposures, and interest rates.

### 🔹 Input 예제
```json
{
  "dailyExpectedSettlement": 35000,
  "usefulLifeYears": 6,
  "elapsedDays": 450,
  "actualSettlementToDate": 9200000,
  "interestRate": 0.065,
  "clientExposure": 60000000,
  "totalExposure": 1500000000
}
```

### 🔹 결과 (요약)
- 일일 예상 상환액 대비 실제 상환액 비교  
- 포트폴리오 비중, 전년도 상환액 가중  
- 최종 ELR 산출 후 0~1 범위 클램프

### 관련조문 (IFRS)
- IFRS 9 금융상품 (→ 기대신용손실(ELR) 모델, 손상차손 인식 및 대손충당금 산정)

---

## 7. CPRM (Convertible Bond Risk Model) | 전환사채
**설명 (KR):** 전환사채의 기본율, 대손, PD, 거래량, 회수율을 종합하여 위험도를 산정합니다.  
**Description (EN):** Calculates convertible bond risk based on base rate, bad debts, PD, volumes, and recoveries.

### 🔹 Input 예제
```json
{
  "baseRate": 0.05,
  "badDebtIncidence": 0.02,
  "assumedDefaultRate": 0.03,
  "bondUnitPrice": 1000,
  "bondVolume": 60000,
  "pastDebtorRecovery": 15000,
  "bondTurnoverPct": 0.55,
  "stockTurnoverPct": 0.72,
  "extraAdj": -0.004,
  "maxValue": 0.30
}
```

### 🔹 결과 (요약)
- 기본율 + 대손/PD 반영  
- 거래량·회수율 조정  
- cap·공제율 적용 최종 위험도 산출

### 관련조문 (IFRS)
- IFRS 9 금융상품 (→ 전환권 포함 사채의 분류(부채/자본 구분), 공정가치 평가.)
- IAS 32 금융상품 : 표시 (Financial Instruments: Presentation)

---

## 8. OCIM (Other Comprehensive Income Model) | 기타포괄손익 복리형
**설명 (KR):** OCI 계정 비중, 기간별 OCI 변동, 민감도, 조정률을 반영한 복리 누적 평가.  
**Description (EN):** Compounds OCI considering account shares, period flows, sensitivity, and adjustments.

### 🔹 Input 예제
```json
{
  "accountOCIAmount": 18000000,
  "totalOCIAllItems": 92000000,
  "openingOCIBalance": 50000000,
  "currentPeriodOCI": 13500000,
  "marketChangeR": 0.045,
  "beta": 1.1,
  "horizonYears": 4
}
```

### 🔹 결과 (요약)
- 계정별 OCI 비중 산정  
- 기초·당기 OCI 합산 후 복리 반영  
- 민감도 및 조정률 기반 재평가

### 관련조문 (IFRS)
- IFRS 9 금융상품 (→ OCI 계정(현금흐름헤지, FVOCI 금융자산 등) 처리 기준)
- IAS 1 재무제표 표시 (Presentation of Finacial Statements)

---

## 9. FAREX (Foreign Exchange Adjustment Model) | 외환 조정
**설명 (KR):** 수출입 데이터를 기반으로 환율 민감도를 조정하고 실질환율을 평가합니다.  
**Description (EN):** Adjusts FX based on export/import data and computes effective exchange rate.

### 🔹 Input 예제
```json
{
  "prevYear_export_curr": 142000000,
  "prevYear_import_curr": 108000000,
  "currYear_export_curr": 160000000,
  "currYear_import_curr": 120000000,
  "currentExchangeRate": 1332
}
```

### 🔹 결과 (요약)
- 전년/금년 수출입 데이터 기반 무역격차 산출  
- 환율 민감도(β, 가중치) 적용  
- 실질환율 산정

### 관련조문 (IFRS)
- IAS 21 외환환율변동의 효과 (The Effects of Changes in Foreign Exchange Rates)

---

## 10. TCT-BEAM (Trigonometric Cost Tracking & BE Analysis Model) | 삼각함수 기반 원가 추적
**설명 (KR):** 고정비·변동비를 삼각함수 각도로 변환하여 수익 민감도와 BEP를 평가합니다.  
**Description (EN):** Uses trigonometric angles of fixed/variable costs to analyze revenue sensitivity and break-even.

### 🔹 Input 예제
```json
{
    "fixedCosts": [920000000, 980000000, 1050000000, 1120000000,
  1200000000],
    "variableCosts": [450000000, 480000000, 520000000, 560000000,
  600000000],
    "currentRevenue": 2100000000,
    "options": {
      "language": "en",
      "includeGraph": true,
      "roundStep": 1000
    }
  }
```

### 🔹 결과 (요약)
- 고정비·변동비 → 각도 변환  
- 매출 대비 손익분기점(BEP) 추정  
- 수익 민감도 분석

### 관련조문 (IFRS)
- IAS 2 재고 (Inventories)
- IAS 1 재무제표 표시 (제조원가 및 고정비, 변동비 구분 및 원가배분 관련.)

---

## 11. CPMRV (Crypto Market Real Value) | 가상화폐 실질가치
**설명 (KR):** 전년도 대비 성장/하락률과 현재 시가를 반영하여 가상화폐 실질가치를 산출합니다.  
**Description (EN):** Evaluates cryptocurrency fair value using past growth/decline rates and current market value.

### 🔹 Input 예제
```json
{
  "previousYearGrowthRate": 0.42,
  "previousYearDeclineRate": 0.10,
  "currentYearGrowthYTD": 0.25,
  "currentYearDeclineYTD": 0.07,
  "currentCryptocurrencyValue": 48000,
  "horizonMonths": 24
}
```

### 🔹 결과 (요약)
- 전년 성장·하락률 반영  
- YTD 성장률 기반 조정  
- 실질가치 계산

### 관련조문 (IFRS)
암호화폐는 해당 조문에서 직접 다루지 않으나 관련 조문은 아래와 같습니다.
- IAS 38 무형자산 (대부분의 암호화폐는 무형자산으로 분류(38.8-17). 단 최초 인식 시에는 원가로 인식되며(38.24), 후속측정시 원가모형 혹은 재평가 모형 선택 가능(38.72))
- IAS 2 재고자산 (암호화폐를 거래를 목적으로 보유하는 경우 (예: 브로커 혹은 딜러), 해당 조문에 의거해 공정가치-매도원가 차감 후 측정 (2.3(b)))
- IFRS 13 공정가치 측정 (실질 가치 산출 시 공정가치 평가가 필요하며(IFRS 13.9, IFRS 13.24~30), 시장참여자 가정에 따른 레빌 1,2,3 입력값을 적용)

---

## 12. DCBPRA (Dynamic CAPM-Based Pricing Risk Adjustment) | 자본자산 가격결정 조정
**설명 (KR):** CAPM에 성장률 보정을 결합하여 동적 위험 프리미엄을 평가합니다.  
**Description (EN):** Adjusts CAPM pricing with real growth rates to dynamically evaluate risk premium.

### 🔹 Input 예제
```json
{
  "riskFreeRate": 0.025,
  "marketReturn": 0.082,
  "beta": 1.38,
  "RS": 0.15,
  "realGrowthPct": 0.039
}
```

### 🔹 결과 (요약)
- CAPM 수식 기반 기대수익 계산  
- RS 및 성장률 보정 반영  
- 최종 위험조정 수익률 산출

### 관련조문 (IFRS)
- IFRS 13.61~66 시장 참여자가 사용하는 할인율/위험프리미엄 산정 근거
- IAS 36.55~57 현금흐름 할인할 때 CAPM 같은 모델 사용가능 (할인율 추정의 한 방법).
- IAS 19.83 연금부채 할인율에 적용 시 CAPM 응용.

---

# 추가 기능(1.0.6 업데이트 이후 반영)
## 📒 JOURNAL (이중언어 분개장 빌더)

**설명:** 한국어(분개장)와 영어(journal) 형식의 회계 분개장을 Excel 파일로 자동 생성 및 관리합니다.  

### 🔹 Input 예제
```json
{
  "company": "세빛 주식회사",
  "text": "2025-03-20 LG전자 사무용품 2,500,000원 카드 결제",
  "options": {
    "baseDir": "Desktop/journal_book",
    "oneWorkbookPerYear": true
  }
}
```

🔹 Output 예제
생성 파일명: 2025_journal.xlsx
월별 시트 자동생성: 01 ~ 12
감사 로그 파일: audit.log


🔹 주요 기능
✅ 자연어 기반 분개 입력 (한/영 지원)
✅ 계정과목 자동 분류 (API + 휴리스틱)
✅ 중복 체크 및 감사 로그 기록
✅ 월별 시트 + 요약(SUMMARY) 시트 자동 갱신


🔹 관련 IFRS
IAS 1, IAS 2, IAS 16, IFRS 9

---

## TCT-BEAM 삼각함수 그래프
고정비와 변동비를 삼각함수 벡터로 표현하여 손익분기점과 수익 민감도를 시각화합니다.  
실행 시 자동으로 SVG/PNG 그래프가 생성됩니다.  

🔹 사용 예시
```json
{
  "fixedCosts": [850000000, 920000000, 995000000],
  "variableCosts": [420000000, 445000000, 485000000],
  "currentRevenue": 1850000000,
  "options": { "chart": true, "outputDir": "./reports" }
}
```
출력 예시: beam_graph.svg

---
## 자동 보고서 생성
세션 실행 결과를 자동으로 PDF 보고서로 생성합니다.
보고서에는 다음 내용이 포함됩니다:

✅실행 로그
✅리스크 등급 분류 (저위험 / 중위험 / 고위험)
✅실행 로드맵 (24시간 / 1주 / 1개월)
✅IFRS 관련 기준 참조

🔹 출력 예시
SEBIT-MCP-Report_2025-09-17_17-03-50.pdf

---

# 📌 유의사항
- 모든 Input은 JSON 형식으로 제공됩니다.  
- 숫자형 변수는 문자열 입력도 허용(`"8%"`, `"0.08"`)  
- 옵션 필드(`options`)는 선택적으로 사용 가능합니다.  
- 자세한 인풋 json에 대해서는 해당 프로젝트 루트안에 있는 SEBIT_FRAMEWORK_INPUT_VALUABLES.docx를 참고하세요.
- 해당 MCP는 국제회계기준인 IFRS를 따르며, 관련조문을 준수합니다.
---

> **라이선스 안내**  
> 이 프로젝트는 **Sebit Public License v1.0 (SPL-1.0)** 하에 배포됩니다.  
> 
> - ✅ 개인, 교육, 연구 목적 사용은 자유롭게 가능  
> - 💼 상업적 사용은 저작자로부터 별도 라이선스 필요  
> - ✍️ 출처 표기("SEBIT")는 모든 사용 및 파생 저작물에 필수  
> 
> 자세한 내용은 [LICENSE](./LICENSE) 및 [NOTICE](./NOTICE) 파일을 참고하세요.  

# 🧾 라이선스 & 기안자
- License: **Sebit Public License v1.0 (SPL-1.0)**
- 기안자: 박승협 (Seounghyup Park)  

# 📬 문의 (Contact)
- Email: **sebit.2508@gmail.com**
- GitHub Issues: [sebit-mcp-public Issues](https://github.com/sebit-provider/sebit-mcp-public/issues)