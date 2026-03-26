/** Maps oscar locale codes to Tesseract language codes */
const LANGUAGE_MAP: Record<string, string> = {
    'en': 'eng',
    'de': 'deu',
    'pl': 'pol',
    'pt': 'por',
    'nl': 'nld',
    'ru': 'rus',
};

export function getTesseractLanguage(oscarLocale: string): string {
    return LANGUAGE_MAP[oscarLocale] || 'eng';
}

export function getSupportedLocales(): string[] {
    return Object.keys(LANGUAGE_MAP);
}
