# Steg 3a: Helhet, orkestrering och integration (TCK-007)

Orkestrering:
1. `LocalWebSocketAdapter` hanterar WebSocket-livscykeln mot `${protocol}//${host}/api/ws/audio` eller angiven serverUrl.
2. Sändning (`publishAudio`): Kopplar MediaStreamTrack till Web Audio pipeline med `MicCapture.worklet.ts` (16 kHz PCM Int16, 100 ms ramar) och sänder binärt via WebSocket med 128 KB backpressure-skydd.
3. Mottagning (`subscribeToTrack`): Tar emot binära PCM-paket från WS och matar dem till `AudioProcessor.worklet.ts` för 300 ms WSOLA-slew buffring, kopplat till AudioDestinationNode och eventuell MediaStreamDestination.
4. `useLocalWebSocket` tillhandahåller reaktiv state (`status`, `remoteStream`, `connect`, `disconnect`, `publishAudio`, `subscribeToTrack`, `unlockAudio`).
