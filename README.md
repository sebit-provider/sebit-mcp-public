# SEBIT-MCP Models (English) 🌍

> 한국어 설명은 아래 링크에서 확인할 수 있습니다.  
> 👉 [README.ko.md](./README.ko.md)

[![License: SPL-1.0](https://img.shields.io/badge/License-SPL--1.0-blue.svg)](./LICENSE)
[![npm version](https://img.shields.io/npm/v/sebit-mcp-public)](https://www.npmjs.com/package/sebit-mcp-public)  
[![npm downloads](https://img.shields.io/npm/dt/sebit-mcp-public)](https://www.npmjs.com/package/sebit-mcp-public)  
[![GitHub stars](https://img.shields.io/github/stars/sebit-provider/sebit-mcp-public?style=social)](https://github.com/sebit-provider/sebit-mcp-public/stargazers)  
[![GitHub issues](https://img.shields.io/github/issues/sebit-provider/sebit-mcp-public)](https://github.com/sebit-provider/sebit-mcp-public/issues)  
[![Last commit](https://img.shields.io/github/last-commit/sebit-provider/sebit-mcp-public)](https://github.com/sebit-provider/sebit-mcp-public/commits/main)

SEBIT (**Systematic Engineered Binancial Intelligence & Tactics**) is an MCP-based framework specialized in **Accounting & Finance**.  
It consists of **12 core models**, each operating on structured JSON inputs and calculation logic.

---

## 🚀 Installation & Run
```bash
git clone https://github.com/sebit-provider/sebit-mcp-public.git
cd sebit-mcp-public
npm install sebit-mcp-public
node dist/mcp-server.js
```

## Claude & Other Client Integration
This framework is MCP-based. To integrate with Claude Desktop (or other MCP clients), edit the `claude_desktop_config.json` file:

```jsonc
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

# 📊 Model Descriptions

## 1. DDA (Dynamic Depreciation Algorithm)
**Description:** Calculates depreciation dynamically, factoring in time, usage, and market sensitivity.

### 🔹 Input example
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

- Daily depreciation based on elapsed days  
- Adjustments for over/under usage  
- Market rate (r) and β sensitivity applied  
- Impairment test & revaluation (cap/thresholds)

**Relevant IFRS:** IAS 16, IAS 36  

---

## 2. LAM (Lease Asset Model)
**Description:** Evaluates lease liabilities and right-of-use (ROU) assets considering cost, rate, and usage.

### 🔹 Input example
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

- PV-based lease liability valuation  
- Depreciation based on usage days  
- Adjustment for residual value & unused term  

**Relevant IFRS:** IFRS 16.23–35  

---

## 3. RVM (Resource Valuation Model)
**Description:** Values resources using cumulative and current mining data with market adjustments.

### 🔹 Input example
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

- Cumulative & period-based resource valuation  
- Market price variation (r) and β sensitivity applied  
- Comparative analysis with previous year  

**Relevant IFRS:** IFRS 6, IAS 16  

---

## 4. CEEM (Consumable Expense Estimation Model)
**Description:** Estimates consumable expenses based on cumulative usage and unit costs.

### 🔹 Input example
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

- Expense = Unit cost × Usage  
- Growth rate (r) and β sensitivity applied  
- Aggregated per-period cost analysis  

**Relevant IFRS:** IAS 2, IAS 16  

---

## 5. BDM (Bond Discounting Model)
**Description:** Discounts bonds to present value considering issue amount, elapsed days, and discount rate.

### 🔹 Input example
```json
{
  "issueAmount": 1000000,
  "scheduleDays": 365,
  "elapsedDays": 90,
  "prevMeasuredValue": 980000,
  "discountRate": 0.05
}
```

- Present Value (PV) based on elapsed days  
- Adjustments with discount rate & β  
- Comparison with prior valuations  

**Relevant IFRS:** IFRS 9  

---

## 6. BELM (Bad Debt Expected Loss Model)
**Description:** Estimates Expected Loss Rate (ELR) using settlements, exposures, and interest rates.

### 🔹 Input example
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

- Expected vs actual settlements  
- Portfolio weighting and historical performance  
- Final ELR (0–1 range)  

**Relevant IFRS:** IFRS 9  

---

## 7. CPRM (Convertible Bond Risk Model)
**Description:** Calculates convertible bond risk based on base rate, bad debts, PD, volumes, and recoveries.

### 🔹 Input example
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

- Base rate + PD + Bad debt incidence  
- Adjustments with trading volumes & recoveries  
- Risk cap applied  

**Relevant IFRS:** IFRS 9, IAS 32  

---

## 8. OCIM (Other Comprehensive Income Model)
**Description:** Compounds OCI considering account shares, flows, sensitivity, and adjustments.

### 🔹 Input example
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

- OCI account share calculation  
- Compound evaluation of opening & current OCI  
- Sensitivity and adjustment applied  

**Relevant IFRS:** IFRS 9, IAS 1  

---

## 9. FAREX (Foreign Exchange Adjustment Model)
**Description:** Adjusts FX based on export/import data and computes effective exchange rate.

### 🔹 Input example
```json
{
  "prevYear_export_curr": 1000,
  "prevYear_import_curr": 800,
  "currYear_export_curr": 1200,
  "currYear_import_curr": 900,
  "currentExchangeRate": 1320
}
```

- Trade balance analysis (YoY comparison)  
- FX sensitivity (β, weights) applied  
- Effective exchange rate computed  

**Relevant IFRS:** IAS 21  

---

## 10. TCT-BEAM (Trigonometric Cost Tracking & BE Analysis Model)
**Description:** Uses trigonometric angles of fixed/variable costs to analyze revenue sensitivity and break-even.

### 🔹 Input example
```json
{
  "fixedCosts": [100, 120, 130],
  "variableCosts": [200, 220, 250],
  "currentRevenue": 500
}
```

- Conversion of costs into angular representation  
- Break-even point (BEP) estimation  
- Sensitivity analysis  

**Relevant IFRS:** IAS 2, IAS 1  

---

## 11. CPMRV (Crypto Market Real Value)
**Description:** Evaluates cryptocurrency fair value using past growth/decline rates and current market value.

### 🔹 Input example
```json
{
  "previousYearGrowthRate": 0.24,
  "previousYearDeclineRate": 0.12,
  "currentYearGrowthYTD": 0.08,
  "currentCryptocurrencyValue": 35000
}
```

- Historical growth/decline rates applied  
- YTD adjustments  
- Real (fair) value computed  

**Relevant IFRS:** IAS 38, IAS 2, IFRS 13  

---

## 12. DCBPRA (Dynamic CAPM-Based Pricing Risk Adjustment)
**Description:** Adjusts CAPM pricing with real growth rates to dynamically evaluate risk premium.

### 🔹 Input example
```json
{
  "riskFreeRate": 0.02,
  "marketReturn": 0.08,
  "beta": 1.1,
  "RS": 0.9,
  "realGrowthPct": 0.045
}
```

- CAPM-based expected return  
- RS & real growth adjustment  
- Final risk-adjusted return  

**Relevant IFRS:** IFRS 13, IAS 36, IAS 19  

---
# Additional Features(Since 1.0.6)
## JOURNAL (Dual-language Journal Builder)

Description: Generates and maintains accounting journals in Excel format with Korean (분개장) and English (journal) ledgers.

🔹 Input example

{
  "company": "SEBIT Corp",
  "text": "2025-01-05 Samsung Electronics office supplies 50000 KRW paid by card",
  "options": {
    "baseDir": "Desktop/journal_book",
    "oneWorkbookPerYear": true
  }
}

🔹 Output example

output filename: 2025_journal.xlsx
Monthly sheets: 01 … 12
Audit log: audit.log


Features:
✅ Natural language → Journal entry (ko/en)
✅ Automatic account classification (API + heuristics)
✅ Duplicate check & audit logging
✅ Monthly sheets + SUMMARY sheet auto-updated


Relevant IFRS: IAS 1, IAS 2, IAS 16, IFRS 9


---
# 📌 Notes
- All inputs must be in JSON format.  
- Numeric fields allow string input (`"8%"`, `"0.08"`)  
- Optional fields (`options`) may be added.  
- See `SEBIT_FRAMEWORK_INPUT_VALUABLES.docx` for detailed input docs.  
- All models comply with IFRS standards.

> **License Notice**  
> This project is licensed under the **Sebit Public License v1.0 (SPL-1.0)**.  
> 
> - ✅ Free for personal, educational, and research purposes  
> - 💼 Commercial use requires a separate license from the Author  
> - ✍️ Attribution ("SEBIT") is required in any use or derivative work  
> 
> For details, see the [LICENSE](./LICENSE) and [NOTICE](./NOTICE) files.  

---

# 🧾 License & Author
- License: **Sebit Public License v1.0(SPL-1.0)**  
- Author: **Seounghyup Park (박승협)**  

# 📬 문의 (Contact)
- Email: **sebit.2508@gmail.com**
- GitHub Issues: [sebit-mcp-public Issues](https://github.com/sebit-provider/sebit-mcp-public/issues)