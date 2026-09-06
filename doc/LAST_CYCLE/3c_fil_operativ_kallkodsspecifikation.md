# Steg 3c: Fil-operativ källkodsspecifikation (TCK-021)

## 1. Berörda filer för domänen `src/features/live_translation/`
- `src/features/live_translation/domain/audioResampler.ts`
- `src/features/live_translation/domain/__tests__/audioResampler.test.ts`
- `src/features/live_translation/hooks/useLiveTranslation.ts`
- `src/features/live_translation/doc/BUSINESS_RULES.md`
- `src/features/live_translation/doc/INTEGRATIONS.md`

## 2. Testfall som ska köras först (TDD)
- Skapa `src/features/live_translation/domain/__tests__/audioResampler.test.ts` som verifierar att:
  1. `downsample48kTo16k` decimerar till exakt en tredjedel av antalet samplar.
  2. Rullande 3-punkts lågpassfiltrering dämpar spikar och högfrekvent aliasing (t.ex. vid alternerande signal [+1, -1, +1]).
  3. Signal clamping till [-32768, 32767] fungerar korrekt utan overflow.

BESLUT: GODKÄND
