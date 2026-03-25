// nicodAImus 16-digit account number formatting helpers
// Ported from public_html/assets/js/account-number.js

export function onlyDigits(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

export function formatAccount16(value: string): string {
  const digits = onlyDigits(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function digits16(value: string): string | null {
  const d = onlyDigits(value);
  return d.length === 16 ? d : null;
}
