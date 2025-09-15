"use strict";
// =============================
// FILE: src/models/journal.ts
// Journal book writer (ko/en)
// - 벤더(거래처)별 파일명: <vendor>_<year>.xlsx
// - 월별 시트("01"~"12") 자동 생성
// - 연도 폴더에 audit.log 기록
// - 구(설명기반) 파일을 벤더기반 파일로 자동 이관
// =============================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runJournal = runJournal;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const XLSX = __importStar(require("xlsx"));
// ---------------------------
// 경로/유틸
// ---------------------------
// 기본 루트: C:\Users\user\Desktop\journal_book
const DEFAULT_ROOT = (() => {
    const home = process.env.USERPROFILE || "C:/Users/user";
    return path.join(home, "Desktop", "journal_book");
})();
const ROOT = process.env.JOURNAL_ROOT || DEFAULT_ROOT;
const ILLEGAL = /[\\/:*?"<>|]/g;
const squash = (s) => (s ?? "").toString().replace(ILLEGAL, "_").trim();
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
function loadOrCreateBook(file) {
    return fs.existsSync(file) ? XLSX.readFile(file) : XLSX.utils.book_new();
}
function saveBook(wb, file) {
    ensureDir(path.dirname(file));
    XLSX.writeFile(wb, file, { bookType: "xlsx" });
}
function monthSheetName(isoDate) {
    const m = new Date(isoDate).getMonth() + 1;
    return m < 10 ? `0${m}` : String(m);
}
function safeVendor(vendor, language) {
    const v = (vendor ?? "").trim();
    if (v)
        return v;
    return language === "en" ? "UnknownVendor" : "미지정거래처";
}
// ---------------------------
// 자연어 파서 (라이트)
// ---------------------------
function parseKoText(text) {
    // 예: "2025년 3월 2일, 스타벅스에서 커피 6,000원 카드 결제"
    const t = text.replace(/\s+/g, " ").trim();
    // 날짜
    const mDate = t.match(/(?<y>\d{4})\s*년\s*(?<m>\d{1,2})\s*월\s*(?<d>\d{1,2})\s*일/);
    const y = mDate?.groups?.y, m = mDate?.groups?.m, d = mDate?.groups?.d;
    const date = y && m && d ? `${y}-${String(+m).padStart(2, "0")}-${String(+d).padStart(2, "0")}` : "";
    // 벤더(…에서 …)
    let vendor = "";
    const mVendor = t.match(/([가-힣A-Za-z0-9 _\-.]+?)에서/);
    if (mVendor)
        vendor = (mVendor[1] || "").trim();
    // 금액/통화
    let amount = 0;
    let currency = "KRW";
    const mWon = t.match(/([\d,]+)\s*원/);
    const mCur = t.match(/([\d,]+)\s*(KRW|USD|EUR)/i);
    if (mWon) {
        amount = parseInt(mWon[1].replace(/,/g, ""), 10);
        currency = "KRW";
    }
    else if (mCur) {
        amount = parseInt(mCur[1].replace(/,/g, ""), 10);
        currency = mCur[2].toUpperCase();
    }
    // 계정 대충 매핑
    let account = "현금";
    if (/카드/.test(t))
        account = "카드";
    if (/식비|커피|식사|음식/.test(t))
        account = "식비";
    // 설명(벤더 뒤 첫 단어 시도)
    let description = "지출";
    const afterVendor = t.split("에서")[1] || "";
    const descPick = afterVendor.match(/([가-힣A-Za-z0-9]+)(?:\s|,|\.|$)/);
    if (descPick)
        description = descPick[1];
    return {
        date, vendor, description, account,
        debit: amount, credit: 0, currency,
        language: "ko"
    };
}
function parseEnText(text) {
    // 예: "Mar 2, 2025 Starbucks coffee 6,000 KRW card"
    const t = text.replace(/\s+/g, " ").trim();
    // 날짜
    let date = "";
    const m1 = t.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{1,2}),\s*(\d{4})/i);
    if (m1) {
        const map = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
        date = `${m1[3]}-${String(map[m1[1].toLowerCase()]).padStart(2, "0")}-${String(+m1[2]).padStart(2, "0")}`;
    }
    const mIso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!date && mIso)
        date = `${mIso[1]}-${mIso[2]}-${mIso[3]}`;
    // 금액/통화
    let amount = 0;
    let currency = "USD";
    const mCur = t.match(/([\d,]+)\s*(USD|KRW|EUR)/i);
    if (mCur) {
        amount = parseInt(mCur[1].replace(/,/g, ""), 10);
        currency = mCur[2].toUpperCase();
    }
    // 계정/벤더/설명
    const account = /card|visa|master|amex/i.test(t) ? "Card" : "Cash";
    let vendor = "UnknownVendor";
    let description = "Expense";
    const beforeAmt = t.split(mCur ? mCur[0] : "####")[0].trim();
    const parts = beforeAmt.split(/\s+/).filter(Boolean);
    if (parts.length >= 1)
        vendor = parts[parts.length - 2] || parts[parts.length - 1];
    if (parts.length >= 2)
        description = parts[parts.length - 1];
    return {
        date, vendor, description, account,
        debit: amount, credit: 0, currency,
        language: "en"
    };
}
// ---------------------------
// 파일 경로 & 구파일 이관
// ---------------------------
function vendorFilePath(company, year, vendor) {
    const dir = path.join(ROOT, squash(company), String(year));
    ensureDir(dir);
    return path.join(dir, `${squash(vendor)}_${year}.xlsx`);
}
function migrateLegacyDescBook(company, year, description, vendorFile) {
    if (!description)
        return;
    const dir = path.join(ROOT, squash(company), String(year));
    const legacy = path.join(dir, `${squash(description)}_${year}.xlsx`);
    if (!fs.existsSync(legacy) || legacy === vendorFile)
        return;
    const oldWb = XLSX.readFile(legacy);
    const newWb = fs.existsSync(vendorFile) ? XLSX.readFile(vendorFile) : XLSX.utils.book_new();
    for (const s of oldWb.SheetNames) {
        const os = oldWb.Sheets[s];
        const oa = XLSX.utils.sheet_to_json(os, { header: 1 });
        if (!oa?.length)
            continue;
        const vs = newWb.Sheets[s];
        if (vs) {
            const va = XLSX.utils.sheet_to_json(vs, { header: 1 });
            const merged = (va || []).concat(oa.slice(va?.length ? 1 : 0)); // 헤더 중복 방지
            newWb.Sheets[s] = XLSX.utils.aoa_to_sheet(merged);
        }
        else {
            newWb.Sheets[s] = XLSX.utils.aoa_to_sheet(oa);
            if (!newWb.SheetNames.includes(s))
                newWb.SheetNames.push(s);
        }
    }
    saveBook(newWb, vendorFile);
    fs.unlinkSync(legacy);
}
// ---------------------------
// 메인: runJournal
// ---------------------------
function runJournal(input) {
    let payload;
    let company = "";
    if ("text" in input) {
        const lang = (input.language || "ko");
        company = (input.company || "").trim();
        payload = lang === "en" ? parseEnText(input.text) : parseKoText(input.text);
    }
    else {
        company = (input.company || "").trim();
        const language = (input.language || "ko");
        payload = {
            date: input.date,
            vendor: input.vendor ?? "",
            description: input.description ?? "",
            account: input.account,
            debit: Math.max(0, +input.debit || 0),
            credit: Math.max(0, +input.credit || 0),
            currency: input.currency || (language === "en" ? "USD" : "KRW"),
            language,
        };
    }
    // 2) 밸리데이션
    if (!company)
        throw new Error("company is required.");
    if (!payload.date)
        throw new Error("date is required.");
    if (!payload.account)
        throw new Error("account is required.");
    if (!(payload.debit > 0 || payload.credit > 0))
        throw new Error("one of debit or credit must be positive.");
    if (payload.debit < 0 || payload.credit < 0)
        throw new Error("amount cannot be negative.");
    // 3) 대상 파일/시트
    const year = new Date(payload.date).getFullYear();
    const vendor = safeVendor(payload.vendor, payload.language);
    const file = vendorFilePath(company, year, vendor);
    migrateLegacyDescBook(company, year, payload.description, file);
    const wb = loadOrCreateBook(file);
    const sheetName = monthSheetName(payload.date);
    const HEADERS = payload.language === "en"
        ? ["Date", "Vendor", "Description", "Account", "Debit", "Credit", "Amount", "Currency"]
        : ["날짜", "거래처", "설명", "계정", "차변", "대변", "금액", "통화"];
    let ws = wb.Sheets[sheetName];
    if (!ws) {
        ws = XLSX.utils.aoa_to_sheet([HEADERS]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    const row = [
        payload.date,
        vendor,
        payload.description || (payload.language === "en" ? "Expense" : "지출"),
        payload.account,
        Number(payload.debit || 0),
        Number(payload.credit || 0),
        Number((payload.debit || 0) + (payload.credit || 0)),
        payload.currency || (payload.language === "en" ? "USD" : "KRW"),
    ];
    // 5) 중복 검사: 날짜+거래처+금액
    const rowsAoa = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const duplicated = rowsAoa.some((r) => String(r?.[0] ?? "") === row[0] &&
        String(r?.[1] ?? "") === row[1] &&
        Number(r?.[6] ?? 0) === row[6]);
    // 6) 중복 아니면 추가
    if (!duplicated) {
        XLSX.utils.sheet_add_aoa(ws, [row], { origin: -1 });
    }
    // 7) 저장 및 로우 인덱스
    const rowIndex = XLSX.utils.sheet_to_json(ws, { header: 1 }).length;
    saveBook(wb, file);
    // 8) 감사 로그
    const yearDir = path.dirname(file);
    const logPath = path.join(yearDir, "audit.log");
    const stamp = new Date().toISOString();
    fs.appendFileSync(logPath, JSON.stringify({
        ts: stamp,
        company,
        year,
        sheet: sheetName,
        rowIndex,
        action: duplicated ? "skip-duplicate" : "append-row",
        row,
    }) + "\n", "utf8");
    // 9) 반환
    const [dateStr, vendorStr, descriptionStr, accountStr, debitNum, creditNum, _amountNum, currencyStr] = row;
    return {
        ok: true,
        duplicated,
        filePath: file,
        sheet: sheetName,
        rowIndex,
        entry: {
            date: dateStr,
            vendor: vendorStr,
            description: descriptionStr,
            account: accountStr,
            debit: debitNum,
            credit: creditNum,
            currency: currencyStr,
            language: payload.language,
        },
    };
}
