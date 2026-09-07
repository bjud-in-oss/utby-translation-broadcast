name: gemini-cloudflare-bridge
description: Orkestrerar ljudkonvertering, Phase 7 adaptive slew, flödeskontroll, Hot Swap-resiliens och WebSocket-koppling mot Gemini Live API.
instructions: |
  - KÖRMILJÖ: Körs direkt i webbläsarkontexten hos arrangören (React-hook / WebAudio) för 100 % gratis drift.
  - AudioResampler konverterar Float32 till 16 kHz Int16 PCM (ingest) och 24 kHz Int16 PCM till Float32 (ut).
  - Applicera strikt clamping `Math.max(-1, Math.min(1, sample))` före Int16-skalning för att förhindra digital wraparound-distorsion vid spikar.
  - Använd frameSizeMs: 100 för att sänka sändningsfrekvensen till Gemini från 50 Hz till 10 Hz.
  - Kedja alla captureFrame-anrop i en seriel Promise-kö och bevaka `ws.bufferedAmount` (128 KB tröskel) för backpressure.
  - PHASE 7 JITTER & DSP PORTNING: Importera och använd `src/features/live_translation/workers/AudioProcessor.worklet.ts` samt `src/features/live_translation/domain/adaptiveLogic.ts` (från Phase 7). Använd den cirkulära bufferten med tidsjustering (+/- 3–5 %) schemalagd mot `AudioContext.currentTime` för att jämna ut Geminis WebSocket-skurar utan klickljud eller tonhöjdsändringar.
  - GEMINI 3.1 & RESILIENS: Målspråk och instruktioner ska skickas med i den initiala setup-payloaden vid WebSocket-anslutning. Spara `newHandle` från `SessionResumptionUpdate`, aktivera `contextWindowCompressionConfig` (`slidingWindow`) och lyssna på `GoAway.timeLeft` för sömlös återanslutning (Hot Swap).