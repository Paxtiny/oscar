export interface OcrLanguageOption {
    readonly code: string;
    readonly tesseractCode: string;
    readonly displayName: string;
}

/** Maps oscar locale codes to Tesseract language codes */
const LANGUAGES: OcrLanguageOption[] = [
    { code: 'de', tesseractCode: 'deu', displayName: 'Deutsch' },
    { code: 'en', tesseractCode: 'eng', displayName: 'English' },
    { code: 'nl', tesseractCode: 'nld', displayName: 'Nederlands' },
    { code: 'pl', tesseractCode: 'pol', displayName: 'Polski' },
    { code: 'pt', tesseractCode: 'por', displayName: 'Portugues' },
    { code: 'ru', tesseractCode: 'rus', displayName: 'Russkij' },
];

const LANGUAGE_MAP: Record<string, string> = {};
for (const lang of LANGUAGES) {
    LANGUAGE_MAP[lang.code] = lang.tesseractCode;
}

export function getTesseractLanguage(oscarLocale: string): string {
    return LANGUAGE_MAP[oscarLocale] || 'eng';
}

export function getSupportedLocales(): string[] {
    return LANGUAGES.map(l => l.code);
}

export function getOcrLanguageOptions(): OcrLanguageOption[] {
    return LANGUAGES;
}

export function getDefaultOcrLanguage(appLocale: string): string {
    // Strip region codes (e.g. pt_BR -> pt, zh_Hans -> zh)
    const base = appLocale.split(/[_-]/)[0] ?? 'en';
    return LANGUAGE_MAP[base] ? base : 'en';
}
