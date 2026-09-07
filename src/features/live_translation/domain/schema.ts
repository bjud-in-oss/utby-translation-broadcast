import { z } from "zod";
import { SUPPORTED_LANGUAGE_CODES } from "./languages";

export const SupportedLanguageSchema = z.enum(SUPPORTED_LANGUAGE_CODES);

export const SessionStatusSchema = z.enum([
  "idle",
  "connecting",
  "active",
  "rotating",
  "error",
]);

export const TranslationSessionConfigSchema = z.object({
  sessionId: z.string().min(1),
  targetLanguage: SupportedLanguageSchema,
  echoTargetLanguage: z.boolean().default(false),
  geminiApiKey: z.string().min(1, "Gemini API-nyckel krävs"),
});

export const QuotaLevelSchema = z.enum([
  "normal",
  "warning_yellow",
  "warning_red",
  "hard_stop",
]);

export const QuotaUsageSchema = z.object({
  monthKey: z.string().regex(/^quota_usage_\d{4}_\d{2}$/),
  trackMinutes: z.number().min(0),
  level: QuotaLevelSchema,
  hardStopLimit: z.number().default(9000),
});

