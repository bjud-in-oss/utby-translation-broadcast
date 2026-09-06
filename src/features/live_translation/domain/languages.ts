export const LANGUAGE_REGIONS = [
  "Afrikanska språk",
  "Nordiska språk",
  "Väst- & Sydeuropeiska språk",
  "Östeuropeiska språk",
  "Mellanöstern & Centralasien",
  "Asien & Sydasien",
] as const;

export type LanguageRegion = (typeof LANGUAGE_REGIONS)[number];

export interface LanguageItem {
  readonly code: string;
  readonly name: string;
  readonly region: LanguageRegion;
  readonly flag: string;
}

export const ALL_LANGUAGES: readonly LanguageItem[] = [
  // Afrikanska språk
  { code: "sw", name: "Swahili", region: "Afrikanska språk", flag: "🇹🇿" },
  { code: "so", name: "Somaliska", region: "Afrikanska språk", flag: "🇸🇴" },
  { code: "am", name: "Amhariska", region: "Afrikanska språk", flag: "🇪🇹" },

  // Nordiska språk
  { code: "sv", name: "Svenska", region: "Nordiska språk", flag: "🇸🇪" },
  { code: "no", name: "Norska", region: "Nordiska språk", flag: "🇳🇴" },
  { code: "da", name: "Danska", region: "Nordiska språk", flag: "🇩🇰" },
  { code: "fi", name: "Finska", region: "Nordiska språk", flag: "🇫🇮" },

  // Väst- & Sydeuropeiska språk
  { code: "en", name: "Engelska", region: "Väst- & Sydeuropeiska språk", flag: "🇬🇧" },
  { code: "es", name: "Spanska", region: "Väst- & Sydeuropeiska språk", flag: "🇪🇸" },
  { code: "de", name: "Tyska", region: "Väst- & Sydeuropeiska språk", flag: "🇩🇪" },
  { code: "fr", name: "Franska", region: "Väst- & Sydeuropeiska språk", flag: "🇫🇷" },
  { code: "it", name: "Italienska", region: "Väst- & Sydeuropeiska språk", flag: "🇮🇹" },
  { code: "pt", name: "Portugisiska", region: "Väst- & Sydeuropeiska språk", flag: "🇵🇹" },
  { code: "nl", name: "Nederländska", region: "Väst- & Sydeuropeiska språk", flag: "🇳🇱" },
  { code: "el", name: "Grekiska", region: "Väst- & Sydeuropeiska språk", flag: "🇬🇷" },

  // Östeuropeiska språk
  { code: "uk", name: "Ukrainska", region: "Östeuropeiska språk", flag: "🇺🇦" },
  { code: "pl", name: "Polska", region: "Östeuropeiska språk", flag: "🇵🇱" },
  { code: "ru", name: "Ryska", region: "Östeuropeiska språk", flag: "🇷🇺" },
  { code: "ro", name: "Rumänska", region: "Östeuropeiska språk", flag: "🇷🇴" },
  { code: "hu", name: "Ungerska", region: "Östeuropeiska språk", flag: "🇭🇺" },
  { code: "cs", name: "Tjeckiska", region: "Östeuropeiska språk", flag: "🇨🇿" },
  { code: "sk", name: "Slovakiska", region: "Östeuropeiska språk", flag: "🇸🇰" },
  { code: "bg", name: "Bulgariska", region: "Östeuropeiska språk", flag: "🇧🇬" },

  // Mellanöstern & Centralasien
  { code: "ar", name: "Arabiska", region: "Mellanöstern & Centralasien", flag: "🇸🇦" },
  { code: "fa", name: "Persiska / Farsi", region: "Mellanöstern & Centralasien", flag: "🇮🇷" },
  { code: "ku", name: "Kurdiska", region: "Mellanöstern & Centralasien", flag: "🇹🇷" },
  { code: "tr", name: "Turkiska", region: "Mellanöstern & Centralasien", flag: "🇹🇷" },
  { code: "he", name: "Hebreiska", region: "Mellanöstern & Centralasien", flag: "🇮🇱" },

  // Asien & Sydasien
  { code: "zh", name: "Kinesiska (Mandarin)", region: "Asien & Sydasien", flag: "🇨🇳" },
  { code: "ja", name: "Japanska", region: "Asien & Sydasien", flag: "🇯🇵" },
  { code: "ko", name: "Koreanska", region: "Asien & Sydasien", flag: "🇰🇷" },
  { code: "hi", name: "Hindi", region: "Asien & Sydasien", flag: "🇮🇳" },
  { code: "ur", name: "Urdu", region: "Asien & Sydasien", flag: "🇵🇰" },
  { code: "vi", name: "Vietnamesiska", region: "Asien & Sydasien", flag: "🇻🇳" },
  { code: "th", name: "Thailändska", region: "Asien & Sydasien", flag: "🇹🇭" },
  { code: "tl", name: "Tagalog / Filipino", region: "Asien & Sydasien", flag: "🇵🇭" },
  { code: "id", name: "Indonesiska", region: "Asien & Sydasien", flag: "🇮🇩" },
] as const;

export const SUPPORTED_LANGUAGE_CODES = [
  "sw", "so", "am",
  "sv", "no", "da", "fi",
  "en", "es", "de", "fr", "it", "pt", "nl", "el",
  "uk", "pl", "ru", "ro", "hu", "cs", "sk", "bg",
  "ar", "fa", "ku", "tr", "he",
  "zh", "ja", "ko", "hi", "ur", "vi", "th", "tl", "id",
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export function getLanguageByCode(code: string): LanguageItem | undefined {
  return ALL_LANGUAGES.find((lang) => lang.code === code);
}
