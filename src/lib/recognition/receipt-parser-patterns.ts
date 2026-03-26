export interface ReceiptParserLocaleConfig {
    readonly tesseractLang: string;
    readonly amountPatterns: RegExp[];
    readonly datePatterns: { regex: RegExp; parse: (match: RegExpMatchArray) => Date | null }[];
    readonly decimalSeparator: '.' | ',';
    readonly thousandsSeparator: string; // '.' | ',' | ' ' | ''
    readonly currencySymbols: string[];
    readonly incomeKeywords: string[];
}

// --- Amount extraction helpers ---

function parseAmountString(raw: string, decimalSep: '.' | ',', thousandsSep: string): number | null {
    let cleaned = raw.trim();

    // Remove currency symbols and whitespace around them
    cleaned = cleaned.replace(/[$\u20AC\u00A3\u00A5\u20BD\u0437\u043B]/g, '').trim();
    // Remove currency codes like EUR, USD, PLN, RUB etc.
    cleaned = cleaned.replace(/\b(EUR|USD|GBP|PLN|CZK|RUB|BRL|CHF|SEK|NOK|DKK)\b/gi, '').trim();

    if (!cleaned) {
        return null;
    }

    // Remove thousands separators
    if (thousandsSep === '.') {
        // DE style: 1.234,56 - dots are thousands, comma is decimal
        cleaned = cleaned.replace(/\./g, '');
    } else if (thousandsSep === ',') {
        // EN style: 1,234.56 - commas are thousands, dot is decimal
        cleaned = cleaned.replace(/,/g, '');
    } else if (thousandsSep === ' ' || thousandsSep === '\u00A0') {
        // RU style: 1 234,56 - spaces are thousands
        cleaned = cleaned.replace(/[\s\u00A0]/g, '');
    }

    // Normalize decimal separator to dot
    if (decimalSep === ',') {
        cleaned = cleaned.replace(',', '.');
    }

    // Remove any remaining non-numeric chars except dot and minus
    cleaned = cleaned.replace(/[^0-9.-]/g, '');

    if (!cleaned) {
        return null;
    }

    const value = parseFloat(cleaned);

    if (isNaN(value) || value < 0) {
        return null;
    }

    // Convert to integer cents
    return Math.round(value * 100);
}

function makeDateParser(order: 'dmy' | 'mdy' | 'ymd') {
    return (match: RegExpMatchArray): Date | null => {
        const p1 = match[1] ?? '';
        const p2 = match[2] ?? '';
        const p3 = match[3] ?? '';
        let day: number, month: number, year: number;

        if (order === 'dmy') {
            day = parseInt(p1, 10);
            month = parseInt(p2, 10);
            year = parseInt(p3, 10);
        } else if (order === 'mdy') {
            month = parseInt(p1, 10);
            day = parseInt(p2, 10);
            year = parseInt(p3, 10);
        } else {
            year = parseInt(p1, 10);
            month = parseInt(p2, 10);
            day = parseInt(p3, 10);
        }

        // Handle 2-digit years
        if (year < 100) {
            year += 2000;
        }

        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1990 || year > 2099) {
            return null;
        }

        return new Date(year, month - 1, day, 12, 0, 0); // noon to avoid timezone issues
    };
}

// --- Locale configs ---

const EN_CONFIG: ReceiptParserLocaleConfig = {
    tesseractLang: 'eng',
    amountPatterns: [
        // $42.50 or $ 42.50
        /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g,
        // 42.50 USD or 42.50
        /(\d{1,3}(?:,\d{3})*\.\d{1,2})\s*(?:USD|EUR|GBP)?/g,
        // Whole numbers: Total: 100
        /(?:total|amount|sum|balance|due|charge|paid)[:\s]+(\d{1,6})\b/gi,
    ],
    datePatterns: [
        { regex: /(\d{4})-(\d{1,2})-(\d{1,2})/g, parse: makeDateParser('ymd') },
        { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/g, parse: makeDateParser('mdy') },
        { regex: /(\d{1,2})\/(\d{1,2})\/(\d{2})\b/g, parse: makeDateParser('mdy') },
    ],
    decimalSeparator: '.',
    thousandsSeparator: ',',
    currencySymbols: ['$', 'USD'],
    incomeKeywords: ['refund', 'credit', 'income', 'reimbursement', 'cashback'],
};

const DE_CONFIG: ReceiptParserLocaleConfig = {
    tesseractLang: 'deu',
    amountPatterns: [
        // EUR 42,50 or 42,50 EUR or 42,50 €
        /(?:EUR|\u20AC)\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/g,
        /(\d{1,3}(?:\.\d{3})*,\d{1,2})\s*(?:EUR|\u20AC)?/g,
        // Whole numbers after total keywords
        /(?:summe|gesamt|total|betrag)[:\s]+(\d{1,6})\b/gi,
    ],
    datePatterns: [
        { regex: /(\d{1,2})\.(\d{1,2})\.(\d{4})/g, parse: makeDateParser('dmy') },
        { regex: /(\d{1,2})\.(\d{1,2})\.(\d{2})\b/g, parse: makeDateParser('dmy') },
    ],
    decimalSeparator: ',',
    thousandsSeparator: '.',
    currencySymbols: ['\u20AC', 'EUR'],
    incomeKeywords: ['erstattung', 'gutschrift', 'einkommen', 'rueckerstattung'],
};

const PL_CONFIG: ReceiptParserLocaleConfig = {
    tesseractLang: 'pol',
    amountPatterns: [
        // 42,50 PLN or PLN 42,50 or 42,50 zł
        /(\d{1,3}(?:\s\d{3})*,\d{1,2})\s*(?:PLN|z\u0142|\u0437\u043B)?/g,
        /(?:PLN|z\u0142)\s*(\d{1,3}(?:\s\d{3})*,\d{1,2})/g,
        /(?:razem|suma|do zap\u0142aty)[:\s]+(\d{1,6})\b/gi,
    ],
    datePatterns: [
        { regex: /(\d{1,2})\.(\d{1,2})\.(\d{4})/g, parse: makeDateParser('dmy') },
        { regex: /(\d{1,2})-(\d{1,2})-(\d{4})/g, parse: makeDateParser('dmy') },
    ],
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    currencySymbols: ['PLN', 'z\u0142'],
    incomeKeywords: ['zwrot', 'korekta', 'przychod'],
};

const PT_CONFIG: ReceiptParserLocaleConfig = {
    tesseractLang: 'por',
    amountPatterns: [
        // R$ 42,50 or 42,50 BRL or 42,50 €
        /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{1,2})/g,
        /(\d{1,3}(?:\.\d{3})*,\d{1,2})\s*(?:BRL|\u20AC|EUR)?/g,
        /(?:total|soma|valor)[:\s]+(\d{1,6})\b/gi,
    ],
    datePatterns: [
        { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/g, parse: makeDateParser('dmy') },
        { regex: /(\d{1,2})\.(\d{1,2})\.(\d{4})/g, parse: makeDateParser('dmy') },
    ],
    decimalSeparator: ',',
    thousandsSeparator: '.',
    currencySymbols: ['R$', 'BRL', '\u20AC', 'EUR'],
    incomeKeywords: ['reembolso', 'credito', 'estorno', 'devolucao'],
};

const NL_CONFIG: ReceiptParserLocaleConfig = {
    tesseractLang: 'nld',
    amountPatterns: [
        // € 42,50 or EUR 42,50 or 42,50 €
        /(?:\u20AC|EUR)\s*(\d{1,3}(?:\.\d{3})*,\d{1,2})/g,
        /(\d{1,3}(?:\.\d{3})*,\d{1,2})\s*(?:\u20AC|EUR)?/g,
        /(?:totaal|bedrag|som)[:\s]+(\d{1,6})\b/gi,
    ],
    datePatterns: [
        { regex: /(\d{1,2})-(\d{1,2})-(\d{4})/g, parse: makeDateParser('dmy') },
        { regex: /(\d{1,2})\.(\d{1,2})\.(\d{4})/g, parse: makeDateParser('dmy') },
    ],
    decimalSeparator: ',',
    thousandsSeparator: '.',
    currencySymbols: ['\u20AC', 'EUR'],
    incomeKeywords: ['terugbetaling', 'creditnota', 'restitutie'],
};

const RU_CONFIG: ReceiptParserLocaleConfig = {
    tesseractLang: 'rus',
    amountPatterns: [
        // 1 234,56 ₽ or 1 234,56 руб or 42,50
        /(\d{1,3}(?:[\s\u00A0]\d{3})*,\d{1,2})\s*(?:\u20BD|\u0440\u0443\u0431\.?)?/g,
        /(?:\u20BD|\u0440\u0443\u0431\.?)\s*(\d{1,3}(?:[\s\u00A0]\d{3})*,\d{1,2})/g,
        /(?:\u0438\u0442\u043E\u0433\u043E|\u0441\u0443\u043C\u043C\u0430|\u0432\u0441\u0435\u0433\u043E)[:\s]+(\d{1,6})\b/gi,
    ],
    datePatterns: [
        { regex: /(\d{1,2})\.(\d{1,2})\.(\d{4})/g, parse: makeDateParser('dmy') },
        { regex: /(\d{1,2})\.(\d{1,2})\.(\d{2})\b/g, parse: makeDateParser('dmy') },
    ],
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    currencySymbols: ['\u20BD', '\u0440\u0443\u0431'],
    incomeKeywords: ['\u0432\u043E\u0437\u0432\u0440\u0430\u0442', '\u043A\u0440\u0435\u0434\u0438\u0442', '\u0434\u043E\u0445\u043E\u0434'],
};

const LOCALE_CONFIGS: Record<string, ReceiptParserLocaleConfig> = {
    en: EN_CONFIG,
    de: DE_CONFIG,
    pl: PL_CONFIG,
    pt: PT_CONFIG,
    nl: NL_CONFIG,
    ru: RU_CONFIG,
};

export function getLocaleConfig(locale: string): ReceiptParserLocaleConfig {
    return LOCALE_CONFIGS[locale] || EN_CONFIG;
}

export function extractAmounts(text: string, locale: string): number[] {
    const config = getLocaleConfig(locale);
    const amounts: number[] = [];

    for (const pattern of config.amountPatterns) {
        // Reset regex state for global patterns
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(text)) !== null) {
            const raw = match[1] ?? '';
            const value = parseAmountString(raw, config.decimalSeparator, config.thousandsSeparator);

            if (value !== null && value > 0) {
                amounts.push(value);
            }
        }
    }

    return amounts;
}

export function extractDate(text: string, locale: string): number | undefined {
    const config = getLocaleConfig(locale);

    for (const { regex, parse } of config.datePatterns) {
        regex.lastIndex = 0;
        const match = regex.exec(text);

        if (match) {
            const date = parse(match);

            if (date) {
                return Math.floor(date.getTime() / 1000);
            }
        }
    }

    return undefined;
}

export function detectTransactionType(text: string, locale: string): number {
    const config = getLocaleConfig(locale);
    const lowerText = text.toLowerCase();

    for (const keyword of config.incomeKeywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
            return 2; // TransactionType.Income
        }
    }

    return 3; // TransactionType.Expense
}
