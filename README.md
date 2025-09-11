# SEBIT-MCP Models (English) 🌍

> 한국어 설명은 아래 링크에서 확인할 수 있습니다.  
> 👉 [README.ko.md](./README.ko.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)  
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

- Daily depreciation based on elapsed days  
- Adjustments for over/under usage  
- Market rate (r) and β sensitivity applied  
- Impairment test & revaluation (cap/thresholds)

**Relevant IFRS:** IAS 16, IAS 36  

---

## 2. LAM (Lease Asset Model)
**Description:** Evaluates lease liabilities and right-of-use (ROU) assets considering cost, rate, and usage.

- PV-based lease liability valuation  
- Depreciation based on usage days  
- Adjustment for residual value & unused term  

**Relevant IFRS:** IFRS 16.23–35  

---

## 3. RVM (Resource Valuation Model)
**Description:** Values resources using cumulative and current mining data with market adjustments.

- Cumulative & period-based resource valuation  
- Market price variation (r) and β sensitivity applied  
- Comparative analysis with previous year  

**Relevant IFRS:** IFRS 6, IAS 16  

---

## 4. CEEM (Consumable Expense Estimation Model)
**Description:** Estimates consumable expenses based on cumulative usage and unit costs.

- Expense = Unit cost × Usage  
- Growth rate (r) and β sensitivity applied  
- Aggregated per-period cost analysis  

**Relevant IFRS:** IAS 2, IAS 16  

---

## 5. BDM (Bond Discounting Model)
**Description:** Discounts bonds to present value considering issue amount, elapsed days, and discount rate.

- Present Value (PV) based on elapsed days  
- Adjustments with discount rate & β  
- Comparison with prior valuations  

**Relevant IFRS:** IFRS 9  

---

## 6. BELM (Bad Debt Expected Loss Model)
**Description:** Estimates Expected Loss Rate (ELR) using settlements, exposures, and interest rates.

- Expected vs actual settlements  
- Portfolio weighting and historical performance  
- Final ELR (0–1 range)  

**Relevant IFRS:** IFRS 9  

---

## 7. CPRM (Convertible Bond Risk Model)
**Description:** Calculates convertible bond risk based on base rate, bad debts, PD, volumes, and recoveries.

- Base rate + PD + Bad debt incidence  
- Adjustments with trading volumes & recoveries  
- Risk cap applied  

**Relevant IFRS:** IFRS 9, IAS 32  

---

## 8. OCIM (Other Comprehensive Income Model)
**Description:** Compounds OCI considering account shares, flows, sensitivity, and adjustments.

- OCI account share calculation  
- Compound evaluation of opening & current OCI  
- Sensitivity and adjustment applied  

**Relevant IFRS:** IFRS 9, IAS 1  

---

## 9. FAREX (Foreign Exchange Adjustment Model)
**Description:** Adjusts FX based on export/import data and computes effective exchange rate.

- Trade balance analysis (YoY comparison)  
- FX sensitivity (β, weights) applied  
- Effective exchange rate computed  

**Relevant IFRS:** IAS 21  

---

## 10. TCT-BEAM (Trigonometric Cost Tracking & BE Analysis Model)
**Description:** Uses trigonometric angles of fixed/variable costs to analyze revenue sensitivity and break-even.

- Conversion of costs into angular representation  
- Break-even point (BEP) estimation  
- Sensitivity analysis  

**Relevant IFRS:** IAS 2, IAS 1  

---

## 11. CPMRV (Crypto Market Real Value)
**Description:** Evaluates cryptocurrency fair value using past growth/decline rates and current market value.

- Historical growth/decline rates applied  
- YTD adjustments  
- Real (fair) value computed  

**Relevant IFRS:** IAS 38, IAS 2, IFRS 13  

---

## 12. DCBPRA (Dynamic CAPM-Based Pricing Risk Adjustment)
**Description:** Adjusts CAPM pricing with real growth rates to dynamically evaluate risk premium.

- CAPM-based expected return  
- RS & real growth adjustment  
- Final risk-adjusted return  

**Relevant IFRS:** IFRS 13, IAS 36, IAS 19  

---

# 📌 Notes
- All inputs must be in JSON format.  
- Numeric fields allow string input (`"8%"`, `"0.08"`)  
- Optional fields (`options`) may be added.  
- See `SEBIT_FRAMEWORK_INPUT_VALUABLES.docx` for detailed input docs.  
- All models comply with IFRS standards.  

---

# 🧾 License & Author
- License: MIT  
- Author: **Seounghyup Park (박승협)**  
