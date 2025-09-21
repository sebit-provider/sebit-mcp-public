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
function loadOrCreateBook(file, language = "ko") {
    if (fs.existsSync(file)) {
        return XLSX.readFile(file);
    }
    // 새 북 생성 시 모든 월 시트 + 요약 시트 미리 생성
    const wb = XLSX.utils.book_new();
    const HEADERS = language === "en"
        ? ["Date", "Vendor", "Description", "Account", "Debit", "Credit", "Amount", "Currency"]
        : ["날짜", "거래처", "설명", "계정", "차변", "대변", "금액", "통화"];
    // 1월~12월 시트 생성
    for (let month = 1; month <= 12; month++) {
        const sheetName = month < 10 ? `0${month}` : String(month);
        const ws = XLSX.utils.aoa_to_sheet([HEADERS]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    // 요약 시트 생성 (13번째)
    const summaryHeaders = language === "en"
        ? ["Month", "Total Debit", "Total Credit", "Balance", "Transaction Count"]
        : ["월", "총 차변", "총 대변", "잔액", "거래건수"];
    const summaryWs = XLSX.utils.aoa_to_sheet([summaryHeaders]);
    XLSX.utils.book_append_sheet(wb, summaryWs, language === "en" ? "Summary" : "요약");
    return wb;
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
// 자연어 파서 (강화버전)
// ---------------------------
// 스마트 계정 분류 함수
function classifyAccountKo(text, paymentMethod) {
    const t = text.toLowerCase();
    // 결제수단 우선 확인
    if (paymentMethod) {
        if (/카드|신용|체크|visa|master|삼성페이|애플페이/.test(paymentMethod))
            return "카드";
        if (/현금|cash/.test(paymentMethod))
            return "현금";
        if (/계좌이체|이체|송금/.test(paymentMethod))
            return "계좌이체";
    }
    // 내용 기반 분류
    if (/식비|커피|음식|식사|밥|점심|저녁|아침|카페|레스토랑|치킨|피자|햄버거|떡볶이/.test(t))
        return "식비";
    if (/교통|버스|지하철|택시|기차|비행기|주유|기름|연료/.test(t))
        return "교통비";
    if (/쇼핑|옷|신발|가방|화장품|액세서리|의류/.test(t))
        return "쇼핑";
    if (/의료|병원|약국|치료|진료|검진/.test(t))
        return "의료비";
    if (/교육|학원|책|강의|수업|학습/.test(t))
        return "교육비";
    if (/통신|핸드폰|인터넷|휴대폰|전화/.test(t))
        return "통신비";
    if (/공과금|전기|가스|수도|관리비|아파트/.test(t))
        return "공과금";
    if (/엔터|영화|게임|놀이|여행|호텔|숙박/.test(t))
        return "엔터테인먼트";
    // 기본값
    return paymentMethod || "기타";
}
function parseRelativeDate(dateStr) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    if (/오늘|today/.test(dateStr)) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    if (/어제|yesterday/.test(dateStr)) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    }
    if (/그저께|일어제/.test(dateStr)) {
        const dayBefore = new Date(today);
        dayBefore.setDate(dayBefore.getDate() - 2);
        return `${dayBefore.getFullYear()}-${String(dayBefore.getMonth() + 1).padStart(2, "0")}-${String(dayBefore.getDate()).padStart(2, "0")}`;
    }
    return "";
}
function parseKoText(text, company) {
    const t = text.replace(/\s+/g, " ").trim();
    const today = new Date();
    // 날짜 파싱 (다양한 형식 지원)
    let date = "";
    // 1. 상대적 날짜 ("오늘", "어제" 등)
    const relativeDate = parseRelativeDate(t);
    if (relativeDate)
        date = relativeDate;
    // 2. 완전한 날짜 (2025년 3월 15일)
    if (!date) {
        const mFullDate = t.match(/(?<y>\d{4})\s*년\s*(?<m>\d{1,2})\s*월\s*(?<d>\d{1,2})\s*일/);
        const y = mFullDate?.groups?.y, m = mFullDate?.groups?.m, d = mFullDate?.groups?.d;
        if (y && m && d)
            date = `${y}-${String(+m).padStart(2, "0")}-${String(+d).padStart(2, "0")}`;
    }
    // 3. 월/일만 (올해로 가정)
    if (!date) {
        const mMonthDay = t.match(/(?<m>\d{1,2})\s*월\s*(?<d>\d{1,2})\s*일/);
        const m = mMonthDay?.groups?.m, d = mMonthDay?.groups?.d;
        if (m && d)
            date = `${today.getFullYear()}-${String(+m).padStart(2, "0")}-${String(+d).padStart(2, "0")}`;
    }
    // 4. 숫자 날짜 (3/15, 03-15 등)
    if (!date) {
        const mNumDate = t.match(/(?<m>\d{1,2})[\/\-](?<d>\d{1,2})/);
        const m = mNumDate?.groups?.m, d = mNumDate?.groups?.d;
        if (m && d)
            date = `${today.getFullYear()}-${String(+m).padStart(2, "0")}-${String(+d).padStart(2, "0")}`;
    }
    // 기본값: 오늘
    if (!date) {
        date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }
    // 벤더 파싱 (다양한 패턴)
    let vendor = "";
    // "XXX에서" 패턴
    const mVendorFrom = t.match(/([가-힣A-Za-z0-9 _\-.&]+?)\s*에서/);
    if (mVendorFrom)
        vendor = mVendorFrom[1].trim();
    // "XXX에" 패턴
    if (!vendor) {
        const mVendorTo = t.match(/([가-힣A-Za-z0-9 _\-.&]+?)\s*에\s/);
        if (mVendorTo)
            vendor = mVendorTo[1].trim();
    }
    // "XXX 구매" 패턴
    if (!vendor) {
        const mVendorBuy = t.match(/([가-힣A-Za-z0-9 _\-.&]+?)\s*(구매|결제|지불)/);
        if (mVendorBuy)
            vendor = mVendorBuy[1].trim();
    }
    // 브랜드명 자동 인식
    const brands = ['스타벅스', '맥도날드', '버거킹', 'KFC', '롯데리아', '쿠팡', '마켓컬리', '이마트', '홈플러스',
        'GS25', 'CU', '세븐일레븐', '카카오택시', '우버', '배달의민족', '요기요'];
    if (!vendor) {
        for (const brand of brands) {
            if (t.includes(brand)) {
                vendor = brand;
                break;
            }
        }
    }
    // 금액 파싱 (다양한 패턴)
    let amount = 0;
    let currency = "KRW";
    // 한국어 금액 (6,000원, 6000원, 6천원 등)
    const mWon = t.match(/([\d,]+)\s*원/) || t.match(/([\d]+)\s*천\s*원/);
    if (mWon) {
        let amountStr = mWon[1];
        if (mWon[0].includes('천원')) {
            amount = parseInt(amountStr) * 1000;
        }
        else {
            amount = parseInt(amountStr.replace(/,/g, ""), 10);
        }
        currency = "KRW";
    }
    // 외화 (100 USD, $100 등)
    if (amount === 0) {
        const mDollar = t.match(/\$\s*([\d,]+)/) || t.match(/([\d,]+)\s*USD/i);
        const mEuro = t.match(/€\s*([\d,]+)/) || t.match(/([\d,]+)\s*EUR/i);
        if (mDollar) {
            amount = parseInt(mDollar[1].replace(/,/g, ""), 10);
            currency = "USD";
        }
        else if (mEuro) {
            amount = parseInt(mEuro[1].replace(/,/g, ""), 10);
            currency = "EUR";
        }
    }
    // 결제수단 파싱
    let paymentMethod = "";
    if (/카드|신용카드|체크카드|visa|master|카드로/.test(t))
        paymentMethod = "카드";
    else if (/현금|cash|현금으로/.test(t))
        paymentMethod = "현금";
    else if (/페이|pay|삼성페이|애플페이|카카오페이/.test(t))
        paymentMethod = "모바일페이";
    else if (/이체|송금|계좌/.test(t))
        paymentMethod = "계좌이체";
    // 스마트 계정 분류
    const account = classifyAccountKo(t, paymentMethod);
    // 설명 추출 (더 똑똑하게)
    let description = "지출";
    // 상품명/서비스명 추출
    const products = ['커피', '아메리카노', '라떼', '빵', '샌드위치', '햄버거', '피자', '치킨',
        '택시', '버스', '지하철', '주유', '쇼핑', '옷', '신발', '책', '영화'];
    for (const product of products) {
        if (t.includes(product)) {
            description = product;
            break;
        }
    }
    // 벤더 뒤의 단어 추출
    if (description === "지출" && vendor) {
        const afterVendor = t.split(vendor)[1] || "";
        const descMatch = afterVendor.match(/([가-힣A-Za-z0-9]+)(?:\s|,|\.|$|원)/);
        if (descMatch && !['에서', '에', '로', '으로', '결제', '지불', '구매'].includes(descMatch[1])) {
            description = descMatch[1];
        }
    }
    return {
        date, vendor, description, account,
        debit: amount, credit: 0, currency,
        language: "ko"
    };
}
// 영어용 스마트 계정 분류
function classifyAccountEn(text, paymentMethod) {
    const t = text.toLowerCase();
    // 결제수단 우선 확인
    if (paymentMethod) {
        if (/card|credit|debit|visa|master|amex|apple\s*pay|samsung\s*pay/.test(paymentMethod))
            return "Card";
        if (/cash|bill/.test(paymentMethod))
            return "Cash";
        if (/transfer|wire|bank/.test(paymentMethod))
            return "Bank Transfer";
    }
    // 내용 기반 분류
    if (/food|coffee|restaurant|lunch|dinner|breakfast|cafe|pizza|burger|meal/.test(t))
        return "Food & Dining";
    if (/transport|bus|subway|taxi|train|flight|uber|lyft|fuel|gas|gasoline/.test(t))
        return "Transportation";
    if (/shopping|clothes|shoes|bag|cosmetics|apparel|retail/.test(t))
        return "Shopping";
    if (/medical|hospital|pharmacy|doctor|treatment|health/.test(t))
        return "Healthcare";
    if (/education|school|book|course|lesson|learning|tuition/.test(t))
        return "Education";
    if (/phone|internet|mobile|telecom|communication/.test(t))
        return "Communication";
    if (/utility|electric|gas|water|rent|apartment|utilities/.test(t))
        return "Utilities";
    if (/entertainment|movie|game|travel|hotel|vacation/.test(t))
        return "Entertainment";
    return paymentMethod || "Other";
}
function parseRelativeDateEn(dateStr) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    if (/today|오늘/.test(dateStr)) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    if (/yesterday|어제/.test(dateStr)) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    }
    return "";
}
function parseEnText(text, company) {
    const t = text.replace(/\s+/g, " ").trim();
    const today = new Date();
    // 날짜 파싱 (다양한 형식 지원)
    let date = "";
    // 1. 상대적 날짜
    const relativeDate = parseRelativeDateEn(t);
    if (relativeDate)
        date = relativeDate;
    // 2. 미국식 날짜 (Mar 15, 2025 / March 15, 2025)
    if (!date) {
        const mUSDate = t.match(/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s*(\d{4})/i);
        if (mUSDate) {
            const monthMap = {
                jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
                apr: 4, april: 4, may: 5, jun: 6, june: 6,
                jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
                oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
            };
            const monthNum = monthMap[mUSDate[1].toLowerCase()];
            date = `${mUSDate[3]}-${String(monthNum).padStart(2, "0")}-${String(+mUSDate[2]).padStart(2, "0")}`;
        }
    }
    // 3. 영국식 날짜 (15 Mar 2025)
    if (!date) {
        const mUKDate = t.match(/(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*(\d{4})/i);
        if (mUKDate) {
            const monthMap = {
                jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
                apr: 4, april: 4, may: 5, jun: 6, june: 6,
                jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
                oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
            };
            const monthNum = monthMap[mUKDate[2].toLowerCase()];
            date = `${mUKDate[3]}-${String(monthNum).padStart(2, "0")}-${String(+mUKDate[1]).padStart(2, "0")}`;
        }
    }
    // 4. ISO 날짜 (2025-03-15)
    if (!date) {
        const mISO = t.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (mISO)
            date = `${mISO[1]}-${mISO[2]}-${mISO[3]}`;
    }
    // 5. 숫자 날짜 (3/15, 03/15, 15/3 등)
    if (!date) {
        const mSlash = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
        if (mSlash) {
            const year = mSlash[3] || today.getFullYear();
            // 미국식 가정 (MM/DD)
            date = `${year}-${String(+mSlash[1]).padStart(2, "0")}-${String(+mSlash[2]).padStart(2, "0")}`;
        }
    }
    // 기본값: 오늘
    if (!date) {
        date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }
    // 벤더 파싱 (다양한 패턴)
    let vendor = "";
    // "at XXX" 패턴
    const mVendorAt = t.match(/\s+at\s+([A-Za-z0-9 _\-.'&]+?)(?:\s|,|\.|$|\d)/);
    if (mVendorAt)
        vendor = mVendorAt[1].trim();
    // "from XXX" 패턴
    if (!vendor) {
        const mVendorFrom = t.match(/\s+from\s+([A-Za-z0-9 _\-.'&]+?)(?:\s|,|\.|$|\d)/);
        if (mVendorFrom)
            vendor = mVendorFrom[1].trim();
    }
    // "XXX purchase" 패턴
    if (!vendor) {
        const mVendorPurchase = t.match(/([A-Za-z0-9 _\-.'&]+?)\s+(purchase|payment|paid)/i);
        if (mVendorPurchase)
            vendor = mVendorPurchase[1].trim();
    }
    // 유명 브랜드 자동 인식
    const brands = ['Starbucks', 'McDonald\'s', 'Burger King', 'KFC', 'Subway', 'Amazon', 'Apple', 'Google',
        'Walmart', 'Target', 'Costco', 'Uber', 'Lyft', 'Netflix', 'Spotify', 'PayPal'];
    if (!vendor) {
        for (const brand of brands) {
            if (new RegExp(`\\b${brand}\\b`, 'i').test(t)) {
                vendor = brand;
                break;
            }
        }
    }
    // 금액 파싱 (다양한 통화)
    let amount = 0;
    let currency = "USD";
    // 달러 ($100, 100 USD, $1,000.50)
    const mDollar = t.match(/\$\s*([\d,]+(?:\.\d{2})?)/) || t.match(/([\d,]+(?:\.\d{2})?)\s*USD/i);
    if (mDollar) {
        amount = parseFloat(mDollar[1].replace(/,/g, ""));
        currency = "USD";
    }
    // 유로 (€100, 100 EUR)
    if (amount === 0) {
        const mEuro = t.match(/€\s*([\d,]+(?:\.\d{2})?)/) || t.match(/([\d,]+(?:\.\d{2})?)\s*EUR/i);
        if (mEuro) {
            amount = parseFloat(mEuro[1].replace(/,/g, ""));
            currency = "EUR";
        }
    }
    // 영국 파운드 (£100, 100 GBP)
    if (amount === 0) {
        const mPound = t.match(/£\s*([\d,]+(?:\.\d{2})?)/) || t.match(/([\d,]+(?:\.\d{2})?)\s*GBP/i);
        if (mPound) {
            amount = parseFloat(mPound[1].replace(/,/g, ""));
            currency = "GBP";
        }
    }
    // 원화 (1000 KRW, 1,000원)
    if (amount === 0) {
        const mKRW = t.match(/([\d,]+)\s*KRW/i) || t.match(/([\d,]+)\s*원/);
        if (mKRW) {
            amount = parseInt(mKRW[1].replace(/,/g, ""), 10);
            currency = "KRW";
        }
    }
    // 결제수단 파싱
    let paymentMethod = "";
    if (/card|credit|debit|visa|master|amex/i.test(t))
        paymentMethod = "Card";
    else if (/cash|bill/i.test(t))
        paymentMethod = "Cash";
    else if (/pay|apple\s*pay|samsung\s*pay|paypal/i.test(t))
        paymentMethod = "Mobile Pay";
    else if (/transfer|wire|bank/i.test(t))
        paymentMethod = "Bank Transfer";
    // 스마트 계정 분류
    const account = classifyAccountEn(t, paymentMethod);
    // 설명 추출
    let description = "Expense";
    // 상품명/서비스명 추출
    const products = ['coffee', 'americano', 'latte', 'bread', 'sandwich', 'burger', 'pizza', 'chicken',
        'taxi', 'bus', 'subway', 'fuel', 'shopping', 'clothes', 'shoes', 'book', 'movie'];
    for (const product of products) {
        if (new RegExp(`\\b${product}\\b`, 'i').test(t)) {
            description = product.charAt(0).toUpperCase() + product.slice(1);
            break;
        }
    }
    // 벤더 뒤의 단어 추출
    if (description === "Expense" && vendor) {
        const afterVendor = t.split(vendor)[1] || "";
        const descMatch = afterVendor.match(/\b([A-Za-z0-9]+)\b/);
        if (descMatch && !['at', 'from', 'for', 'with', 'payment', 'purchase', 'paid'].includes(descMatch[1].toLowerCase())) {
            description = descMatch[1].charAt(0).toUpperCase() + descMatch[1].slice(1);
        }
    }
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
        payload = lang === "en" ? parseEnText(input.text, company) : parseKoText(input.text, company);
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
    const wb = loadOrCreateBook(file, payload.language);
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
