import type { SupportedLanguageCode } from "./languages";

export type SupportedLanguage = SupportedLanguageCode;

export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

export type SessionStatus = "idle" | "connecting" | "active" | "rotating" | "error";

export interface AudioFrameData {
  samples: Int16Array;
  sampleRate: number;
  channels: number;
  timestamp: number;
}

export interface TranslationSessionConfig {
  sessionId: string;
  targetLanguage: SupportedLanguage;
  echoTargetLanguage?: boolean;
  geminiApiKey: string;
}

export interface TokenResponse {
  token: string;
  expiresAt: number;
}

export interface ResumptionState {
  handle: string | null;
  lastActiveTime: number;
  rotationCount: number;
}
