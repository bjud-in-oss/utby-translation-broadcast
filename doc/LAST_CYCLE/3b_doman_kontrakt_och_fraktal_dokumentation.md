# Steg 3b: Domän, kontrakt och fraktal dokumentation (TCK-007)

## Kontrakt och filer
- `src/features/live_translation/domain/types.ts`:
  - Återanvänder `AudioTransportAdapter` och `AudioTransportStatus`.
- `src/features/live_translation/workers/MicCapture.worklet.ts`:
  - AudioWorkletProcessor för mikrofoninsamling i 16 kHz Int16 PCM (100 ms ramar).
- `src/features/live_translation/domain/LocalWebSocketAdapter.ts`:
  - Implementerar `AudioTransportAdapter` med Dynamic Protocol Switch, 128 KB backpressure och 300 ms WSOLA-jitterbuffert via `AudioProcessor.worklet.ts`.
- `src/features/live_translation/hooks/useLocalWebSocket.ts`:
  - React-hook för adapterorkestrering och iOS Safari audio-upplåsning.
- Tester:
  - `src/features/live_translation/domain/__tests__/localWebSocketAdapter.test.ts`
  - `src/features/live_translation/hooks/__tests__/useLiveTranslation.test.ts`
