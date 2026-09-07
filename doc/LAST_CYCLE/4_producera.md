# Steg 4: Producera (TCK-007)

## Genomförande
Samtliga komponenter och integrationer för `LocalWebSocketAdapter`, `useLocalWebSocket` och transportväxling i `useLiveTranslation` har implementerats och säkrats enligt TDD-principen.

### Utförda ändringar
1. **TDD Enhetstester:**
   - `src/features/live_translation/domain/__tests__/localWebSocketAdapter.test.ts`: Validerar WebSocket-anslutning, dynamisk protokollväxling (wss/ws), arraybuffer, backpressure (>128 KB drop), PCM prenumeration och disconnect.
   - `src/features/live_translation/hooks/__tests__/useLiveTranslation.test.ts`: Verifierar `transportMode` ('sfu' | 'local_ws', default 'sfu'), `setTransportMode`, laddning av `MicCapture.worklet.ts` via AudioWorklet samt nedkoppling vid `stopTranslation` och `panicMute`.
   - `src/features/live_translation/hooks/__tests__/useLocalWebSocket.test.ts`: Testar hookens statusflöde, anslutning, publicering, prenumeration och automatisk disconnect vid unmount.

2. **Källkod:**
   - `src/features/live_translation/domain/LocalWebSocketAdapter.ts`: Fullständig implementation av `AudioTransportAdapter` med Zero-GC binär transport, backpressure-skydd, WSOLA-buffring och aktiv felhantering.
   - `src/features/live_translation/hooks/useLocalWebSocket.ts`: Hook för lokal WebSocket-transport med unmount-teardown och statuslyssnare.
   - `src/features/live_translation/hooks/useLiveTranslation.ts`: Ersatt ScriptProcessorNode helt med `MicCapture.worklet.ts`, tillagt `transportMode` ('sfu' | 'local_ws'), integrerat både `CloudflareSFUAdapter` och `LocalWebSocketAdapter` i `startTranslation`/`stopTranslation` samt clean disconnect vid byte, stopp och panik-tystning.
   - `src/features/live_translation/index.ts`: Exponerar `LocalWebSocketAdapter` och `useLocalWebSocket`.

## Verifiering
Samtliga linjekvoter (<250 rader per fil), typkrav (inga any), aktiv felhantering (inga tomma catch) och TDD-ordning uppfylls.
