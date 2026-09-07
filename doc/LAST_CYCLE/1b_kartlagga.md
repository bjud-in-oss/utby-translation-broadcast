# Steg 1b: Kartlägga (TCK-003: Cloudflare Calls SFU Worker-proxy och Gemini Live Bridge)

## 1. Besvarande av GROW-frågorna mot Risknoder

### Svar GROW 1 (Ljudresampling, Clamping och 100 ms-paketering):
I `translationBridge.ts` ackumuleras inkommande ljud i 1600 samplers block (100 ms vid 16 kHz) vilket sänker WebSocket-frekvensen till 10 Hz. Clamping `Math.max(-1, Math.min(1, sample))` appliceras före skalning till 16-bit signed integer.

### Svar GROW 2 (Backpressure och Hot Swap-resiliens):
Om `ws.bufferedAmount > 128 * 1024` (128 KB) droppas ramen för att förhindra lagg. Setup-payloaden inkluderar `contextWindowCompressionConfig: { slidingWindow: {} }`. `newHandle` från `sessionResumptionUpdate` sparas i `HotSwapManager`, och `goAway.timeLeft` hanteras med timer för proaktiv sömlös övergång.

### Svar GROW 3 (Jitter- och Slew-adaption):
`AudioProcessor.worklet.ts` och `adaptiveLogic.ts` importeras för ringbuffert och dynamisk hastighetsjustering (+/- 3–5 %) baserad på buffertfyllnadsgrad och regressionsmodellering.

---

```json
{
  "active_vectors": ["sfu_gemini_bridge"],
  "status": "IN_PROGRESS",
  "current_domain": "live_translation",
  "next_step": "2a_forandra_utat_vision",
  "ticket_id": "TCK-003"
}
```
