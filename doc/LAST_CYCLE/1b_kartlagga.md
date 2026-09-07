# Steg 1b: Kartlägga (TCK-005)

## Svar på GROW-frågor
1. **Contract & State:** `LiveKitTokenRequestSchema` tas bort helt ur `domain/schema.ts` och `LiveKitTokenRequest` tas bort ur `domain/types.ts`. `TranslationSessionConfigSchema` och `TranslationSessionConfig` behåller endast `sessionId`, `targetLanguage`, `echoTargetLanguage` och `geminiApiKey`. Zod-validering förblir aktiv med `SupportedLanguageSchema`, `SessionStatusSchema`, `QuotaLevelSchema` och `QuotaUsageSchema`.
2. **Effects & Pacing:** Gemini Live BidiGenerateContent är full-duplex och strömmar 24 kHz kontinuerligt; tur-baserad durationsprediktion (`calculateRegressionModel`, `predictTurnDuration`) är inte längre relevant och markeras med `@deprecated` eller ersätts med buffertbaserad slew (`calculateBufferSlewRate`). `AudioProcessor.worklet.ts` förblir orörd med sin 300 ms (7 200 samples) målnivå och micro-slew rate limiting.
3. **Resilience:** I `useLiveTranslation.ts` tas kontrollerna för `LIVEKIT_URL` och `LIVEKIT_API_KEY` bort, vilket eliminerar falsklarm i UI:t och lämnar endast validering av `GEMINI_API_KEY`.

```json
{
  "active_vectors": [
    "livekit_cleanup_refactor"
  ]
}
```
