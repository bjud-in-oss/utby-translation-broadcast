# Steg 4: Producera (TCK-005)

## Genomförda förändringar
1. **useLiveTranslation.ts**:
   - Rensat bort alla kontroller och varningar för `LIVEKIT_URL` och `LIVEKIT_API_KEY`.
   - Endast `GEMINI_API_KEY` valideras vid uppstart.
2. **domain/schema.ts**:
   - `LiveKitTokenRequestSchema` borttaget.
   - `livekitUrl` och `livekitToken` borttagna ur `TranslationSessionConfigSchema`.
3. **domain/types.ts**:
   - `LiveKitTokenRequest` borttagen.
   - `livekitUrl` och `livekitToken` borttagna ur `TranslationSessionConfig`.
4. **index.ts**:
   - Re-exporter för LiveKit-typer och scheman borttagna.
5. **domain/adaptiveLogic.ts**:
   - `calculateRegressionModel` och `predictTurnDuration` har markerats som `@deprecated` med förtydligande om Gemini Live BidiGenerateContent full-duplex.
   - Adaptiv ringbuffert-slew (`calculateAdaptiveSlewRate`) tillagd för integration med `AudioProcessor.worklet.ts`.
6. **src/App.tsx**:
   - UI-text uppdaterad till att referera till Cloudflare SFU / Lokal WS.
7. **Tester**:
   - Enhetstester uppdaterade: inga förväntningar på `LIVEKIT`-miljövariabler finns kvar.
