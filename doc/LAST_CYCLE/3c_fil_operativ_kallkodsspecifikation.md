# Steg 3c: Fil-operativ källkodsspecifikation (TCK-007)

## Berörda filer i Steg 4
1. `src/features/live_translation/domain/__tests__/localWebSocketAdapter.test.ts` (TDD Enhetstester för LocalWebSocketAdapter)
2. `src/features/live_translation/hooks/__tests__/useLiveTranslation.test.ts` (TDD Enhetstester för useLiveTranslation med audio worklet och transportswitch)
3. `src/features/live_translation/hooks/__tests__/useLocalWebSocket.test.ts` (TDD Enhetstester för useLocalWebSocket med unmount teardown)
4. `src/features/live_translation/workers/MicCapture.worklet.ts` (AudioWorkletProcessor för 16 kHz Int16 mikrofoninsamling)
5. `src/features/live_translation/domain/LocalWebSocketAdapter.ts` (Implementering av AudioTransportAdapter)
6. `src/features/live_translation/hooks/useLocalWebSocket.ts` (React-hook för lokal WebSocket-transport)
7. `src/features/live_translation/hooks/useLiveTranslation.ts` (Huvudhook med worklet-capture och transportväxling)
8. `src/features/live_translation/index.ts` (Fasadexporter för LocalWebSocketAdapter och useLocalWebSocket)
