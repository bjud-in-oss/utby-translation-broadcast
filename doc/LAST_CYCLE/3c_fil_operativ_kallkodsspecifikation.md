# Steg 3c: Fil-operativ källkodsspecifikation (TCK-007)

## Berörda filer i Steg 4
1. `src/features/live_translation/domain/__tests__/localWebSocketAdapter.test.ts` (TDD Enhetstester med mockning av WebSocket, AudioContext, AudioWorkletNode, addModule)
2. `src/features/live_translation/hooks/__tests__/useLiveTranslation.test.ts` (TDD Enhetstester för useLiveTranslation med audio worklet mock)
3. `src/features/live_translation/workers/MicCapture.worklet.ts` (AudioWorkletProcessor för 16 kHz Int16 mikrofoninsamling)
4. `src/features/live_translation/domain/LocalWebSocketAdapter.ts` (Implementering av AudioTransportAdapter)
5. `src/features/live_translation/hooks/useLocalWebSocket.ts` (React-hook)
6. `src/features/live_translation/index.ts` (Export av `LocalWebSocketAdapter` och `useLocalWebSocket`)
