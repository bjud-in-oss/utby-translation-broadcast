name: gemini-cloudflare-bridge
description: Orkestrerar ljudkonvertering, flödeskontroll och WebSocket-koppling mellan Cloudflare Calls och Gemini Live API.
instructions: |
  - Körs i webbläsarkontexten hos arrangören (React-hook / WebAudio) för 100 % gratis drift[cite: 10, 16].
  - AudioResampler konverterar Float32 till 16 kHz Int16 PCM (in) och 24 kHz Int16 PCM till Float32 (ut)[cite: 3].
  - Applicera strikt clamping `Math.max(-1, Math.min(1, sample))` före Int16-skalning för att förhindra digital wraparound-distorsion[cite: 3].
  - Använd frameSizeMs: 100 för att sänka sändningsfrekvensen till Gemini från 50 Hz till 10 Hz[cite: 9].
  - Kedja alla captureFrame-anrop i en seriel Promise-kö och bevaka `ws.bufferedAmount` (128 KB tröskel) för backpressure[cite: 10].
  - För Gemini 3.1-kompatibilitet ska målspråk och instruktioner skickas med i den initiala setup-payloaden vid WebSocket-anslutning[cite: 11].
  - Spara `newHandle` från `SessionResumptionUpdate` och lyssna på `GoAway.timeLeft` för sömlös återanslutning[cite: 13, 25].
  - Mottagarens 24 kHz-uppspelning ska schemaläggas jämnt mot `AudioContext.currentTime` för att eliminera jitter och klickljud[cite: 14].