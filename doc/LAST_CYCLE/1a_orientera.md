# Steg 1a: Orientera (TCK-007)

## Mål
Implementera `LocalWebSocketAdapter` och `useLocalWebSocket` enligt `doc/skills/local-websocket-wsola-bridge.md`. Adaptern ska implementera `AudioTransportAdapter` för lokal ljudströmning över TCP/WebSocket i nätverksmiljöer med spärrade UDP-portar (kyrkor, skolor, offentliga nät).

## GROW-frågor mot ändringens faktiska risknoder
1. **Contract & Dynamic Protocol (Protokollväxling och transportkontrakt):** Hur ska `LocalWebSocketAdapter` dynamiskt switcha mellan `wss://` vid HTTPS och `ws://` vid HTTP när ingen explicit `serverUrl` anges, och hur säkerställs att `AudioTransportAdapter`-kontraktet uppfylls utan avvikelser i metodsignaturer?
2. **State, Buffer & Backpressure (Zero-GC och TCP-resiliens):** Hur hanteras mikropauser och TCP-backpressure så att 100 ms-ramar kasseras om `ws.bufferedAmount > 128 KB`, och hur matas inkommande PCM-paket via `AudioProcessor.worklet.ts` för adaptiv 300 ms WSOLA-slew utan onödiga minnesallokeringar?
3. **Effects & Resilience (AudioWorklet-laddning och AudioContext-upplåsning):** Hur ska `MicCapture.worklet.ts` och `AudioProcessor.worklet.ts` laddas säkert via `audioCtx.audioWorklet.addModule` med graciös fallback i testmiljöer, och hur orkestrerar `useLocalWebSocket` synkron iOS Safari audio-upplåsning vid användarinteraktion?
