# Steg 1b: Kartlägga (TCK-007)

## Svar på GROW-frågor
1. **Contract & Dynamic Protocol:** `LocalWebSocketAdapter` kontrollerar `window.location.protocol`. Vid `"https:"` används `wss://${window.location.host}/api/ws/audio`, annars `ws://`. Adaptern implementerar samtliga metoder i `AudioTransportAdapter` (`connect`, `disconnect`, `publishAudio`, `subscribeToTrack`, `getRemoteStream`, `getStatus`, `onStatusChange`).
2. **State, Buffer & Backpressure:** För Zero-GC sätts `ws.binaryType = "arraybuffer"`. Vid sändning skickas 100 ms-ramar (1600 samples vid 16 kHz Int16), och om `ws.bufferedAmount > 128 * 1024` droppas ramen direkt. Inkommande binära PCM-paket tas emot och matas till `AudioProcessor.worklet.ts` (eller cirkulär ringbuffert med 300 ms målbuffert) för adaptiv WSOLA-slew.
3. **Effects & Resilience:** `audioCtx.audioWorklet?.addModule` anropas för worklet-registrering med try/catch-skydd i icke-worklet/mockade miljöer. `useLocalWebSocket` tillhandahåller synkron `unlockAudio()` (AudioContext med tyst buffer) för iOS Safari.

```json
{
  "active_vectors": [
    "local_websocket_wsola"
  ]
}
```
