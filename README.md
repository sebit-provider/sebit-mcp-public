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
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["C:\\Users\\user\\sebit-mcp-public\\dist\\mcp-server.js"],
      "cwd": "C:\\Users\\user\\sebit-mcp-public",
      "optional": true
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
  "acquisitionCost": 8000000,
  "residualValue": 300000,
  "leaseTermYears": 4,
  "daysUsedThisPeriod": 120,
  "totalDays": 1460,
  "discountRate": 0.055
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
  "cumulativeMiningDays": 1500,
  "cumulativeMinedValue": 75000,
  "currentPeriodMiningDays": 90,
  "currentPeriodMinedValue": 5600,
  "currentResourcePrice": 52,
  "prevYearValuation": 68000,
  "currentValuation": 73000
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
  "cumulativeUsage": 15000,
  "unitCost": 18.5,
  "periodDays": 90,
  "totalUsage": 1400,
  "prevYearR": 0.06,
  "beta": 0.8,
  "years": 2
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
  "issueAmount": 50000000,
  "scheduleDays": 1825,
  "elapsedDays": 365,
  "prevMeasuredValue": 48200000,
  "discountRate": 0.047
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
  "dailyExpectedSettlement": 35000,
  "usefulLifeYears": 6,
  "elapsedDays": 450,
  "actualSettlementToDate": 9200000,
  "interestRate": 0.065,
  "clientExposure": 60000000,
  "totalExposure": 1500000000
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
  "accountOCIAmount": 18000000,
  "totalOCIAllItems": 92000000,
  "openingOCIBalance": 50000000,
  "currentPeriodOCI": 13500000,
  "marketChangeR": 0.045,
  "beta": 1.1,
  "horizonYears": 4
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
  "prevYear_export_curr": 142000000,
  "prevYear_import_curr": 108000000,
  "currYear_export_curr": 160000000,
  "currYear_import_curr": 120000000,
  "currentExchangeRate": 1332
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
  "previousYearGrowthRate": 0.42,
  "previousYearDeclineRate": 0.10,
  "currentYearGrowthYTD": 0.25,
  "currentYearDeclineYTD": 0.07,
  "currentCryptocurrencyValue": 48000,
  "horizonMonths": 24
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
  "riskFreeRate": 0.025,
  "marketReturn": 0.082,
  "beta": 1.38,
  "RS": 0.15,
  "realGrowthPct": 0.039
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
```json
{
  "company": "SEBIT Corp",
  "text": "2025-03-20 LG Electronics laptop purchase 2,500,000 KRW paid by bank transfer",
  "options": {
    "baseDir": "Desktop/journal_book",
    "oneWorkbookPerYear": true
  }
}
```

Natural Language Journal Entry(Updated at v1.0.8): You can now generate accounting journal entries without writing JSON. Just type a natural language sentence in English or Korean, and the system will parse and classify automatically.
```
I purchase LG Electronics laptop 2,500,000 KRW, paid by bank transfer.
```

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

## TCT-BEAM Trigonometric Graphs(Added 1.0.7)
Visualizes fixed and variable costs as trigonometric vectors.
Provides a break-even chart with angle sensitivity (θ) and revenue-performance visualization.
Output: SVG/PNG charts auto-generated for each run.


🔹 Example usage

```json
{
  "fixedCosts": [850000000, 920000000, 995000000],
  "variableCosts": [420000000, 445000000, 485000000],
  "currentRevenue": 1850000000,
  "options": { "chart": true, "outputDir": "./reports" }
}
```

Output: beam_graph.svg

---
## Automated Report Generation(Added 1.0.7)

Generates a structured PDF report for each MCP session.

Includes:
✅Model execution logs
✅Aggregated risk classification (Low / Medium / High)
✅Strategic roadmap (24h, 1 week, 1 month)
✅IFRS references

🔹 Example output
SEBIT-MCP-Report_2025-09-17_17-03-50.pdf

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