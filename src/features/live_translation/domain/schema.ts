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

export const LiveKitTokenRequestSchema = z.object({
  roomName: z.string().min(1, "Rumsnamn krävs"),
  participantIdentity: z.string().min(1, "Identitet krävs"),
  role: z.enum(["broadcaster", "listener", "bridge_bot"]),
  targetLanguage: SupportedLanguageSchema.optional(),
});

export const TranslationSessionConfigSchema = z.object({
  sessionId: z.string().min(1),
  targetLanguage: SupportedLanguageSchema,
  echoTargetLanguage: z.boolean().default(false),
  geminiApiKey: z.string().min(1, "Gemini API-nyckel krävs"),
  livekitUrl: z.string().url().optional(),
  livekitToken: z.string().optional(),
});
