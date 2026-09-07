# Steg 3c: Fil-operativ källkodsspecifikation (TCK-008)

## Berörda filer i Steg 4
1. `src/features/live_translation/hooks/__tests__/useLiveTranslation.test.ts` (TDD Enhetstester som verifierar flexibla MediaTrackConstraints och hantering av OverconstrainedError)
2. `src/features/live_translation/hooks/useLiveTranslation.ts` (Uppmjukade audioConstraints med `{ ideal: 16000 }` och felhantering)

BESLUT: GODKÄND
