export { LiveTranslationWidget } from "./components/LiveTranslationWidget";
export { useLiveTranslation } from "./hooks/useLiveTranslation";
export { useCloudflareSFU, unlockAudio } from "./hooks/useCloudflareSFU";
export { AudioResampler } from "./domain/audioResampler";
export { HotSwapManager } from "./domain/hotSwapManager";
export { TranslationBridge } from "./domain/translationBridge";
export { MultiBridgeOrchestrator } from "./domain/multiBridgeOrchestrator";
export { ALL_LANGUAGES, LANGUAGE_REGIONS, getLanguageByCode } from "./domain/languages";

export type {
  SupportedLanguage,
  SessionStatus,
  AudioInputDevice,
  AudioFrameData,
  TranslationSessionConfig,
  LiveKitTokenRequest,
  TokenResponse,
  ResumptionState,
} from "./domain/types";

export {
  SupportedLanguageSchema,
  SessionStatusSchema,
  LiveKitTokenRequestSchema,
  TranslationSessionConfigSchema,
} from "./domain/schema";
