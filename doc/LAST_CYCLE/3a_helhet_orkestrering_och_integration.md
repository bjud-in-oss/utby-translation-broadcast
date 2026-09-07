# Steg 3a: Helhet, orkestrering och integration (TCK-008)

## Orkestrering
1. `useLiveTranslation.startTranslation()` konfigurerar `MediaTrackConstraints` med `sampleRate: { ideal: 16000 }` (alternativt utan sampleRate-begränsning).
2. `navigator.mediaDevices.getUserMedia({ audio: audioConstraints })` anropas. Om hårdvaran inte stöder exakt 16 kHz tillhandahåller webbläsaren ljudströmmen i sin nativa samplingsfrekvens utan `OverconstrainedError`.
3. Web Audio-pipelinen kopplar ihop mikrofonströmmen via `audioCtx.createMediaStreamSource(stream)` och matar data till `MicCapture.worklet.ts`.
4. Workleten och `MultiBridgeOrchestrator` sköter konvertering till 16 kHz PCM Int16 och vidareförmedling till Gemini Live API samt valda adaptrar (`CloudflareSFUAdapter` eller `LocalWebSocketAdapter`).
