# Steg 3b: Domän, kontrakt och fraktal dokumentation (TCK-008)

## Kontrakt och typer
- `src/features/live_translation/hooks/useLiveTranslation.ts`:
  - Använder standardiserade `MediaTrackConstraints` utan tvingande samplingskrav.
  - Exponerar oförändrat externt gränssnitt (`status`, `targetLanguage`, `activeLanguages`, `audioLevel`, `audioDevices`, `selectedDeviceId`, `transportMode`, `error`, `configWarning`, `startTranslation`, `stopTranslation`, etc.).
- Enhetstester:
  - `src/features/live_translation/hooks/__tests__/useLiveTranslation.test.ts`
