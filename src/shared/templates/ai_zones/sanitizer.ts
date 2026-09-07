/**
 * ZON 1: SANITIZER (Sidoeffektsfri tvätt)
 * FÅR INTE innehålla API-nycklar, fetch, window, document eller localStorage.
 */
export function sanitizeInput(rawInput: string): string {
  if (!rawInput) return '';
  return rawInput
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}
