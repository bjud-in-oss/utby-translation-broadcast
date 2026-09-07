# Steg 1a: Orientera (TCK-003: Cloudflare Calls SFU Worker-proxy och Gemini Live Bridge)

## 1. Tre fokuserade GROW-frågor ställda mot faktiska risknoder

- **GROW 1 (Contract / Audio Ingest & Resampling):** Hur garanterar vi att ljudflödet från WebRTC/SFU (48 kHz Float32) konverteras till 16 kHz Int16 PCM med strikt clamping `Math.max(-1, Math.min(1, sample))` och paketeras i 100 ms-ramar (10 Hz) utan minnesläckor eller spikdistorsion?
- **GROW 2 (State & Resilience / Backpressure & Hot Swap):** Hur hanteras backpressure när `ws.bufferedAmount` överstiger 128 KB, och hur integreras `newHandle` från `sessionResumptionUpdate`, `slidingWindow` och `GoAway.timeLeft` för sömlös återanslutning utan att kapa pågående tolkning?
- **GROW 3 (Effects / Jitter & Slew Adaptation):** Hur tillämpas `AudioProcessor.worklet.ts` och `adaptiveLogic.ts` för adaptiv slew (+/- 3–5 %) och cirkulär ringbuffert mot nätverksjitter för att eliminera klickljud vid WebSocket-skurar?
