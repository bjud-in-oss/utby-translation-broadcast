# Steg 4: Producera (TCK-003)

## Genomförd implementation
1. **Cloudflare Worker & SFU Hook:**
   - Uppdaterade `useCloudflareSFU.ts` till att gå mot `/api/sfu/session/new` och `/api/sfu/tracks/new`.
   - Lade till automatisk unmount-städning med `useEffect` som anropar `disconnect()`.
   - Implementerade synkron `unlockAudio()` som körs i användarens klick-stack före await.
   - Lade till try-catch med 400 Bad Request vid felaktig JSON i `cloudflare-worker/src/index.ts`.
2. **TranslationBridge & Gemini Live:**
   - Kopplade ljudflödet från SFU mot Gemini Live WebSocket (`BidiGenerateContent`).
   - Importerade och integrerade `AudioProcessor.worklet.ts` och `adaptiveLogic.ts` för adaptiv slew (+/- 3–5 %) och ringbuffert mot jitter.
   - Säkerställde 100 ms-paketering (10 Hz frekvens, 1600 samplar vid 16 kHz) med strikt clamping `Math.max(-1, Math.min(1, sample))`.
   - Implementerade backpressure-kontroll mot `ws.bufferedAmount` (128 KB tröskel).
   - Aktiverade Hot Swap-resiliens med `slidingWindow`, `newHandle` från `sessionResumptionUpdate` och `goAway.timeLeft`.
3. **TDD & Typsäkerhet:**
   - Skapade och verifierade enhetstester i `translationBridge.test.ts` och `useCloudflareSFU.test.ts` före källkod.
   - Eliminerade alla `any`-typer och säkerställde att alla filer håller sig under 250 rader och kompilerar felfritt med strikt TypeScript.
