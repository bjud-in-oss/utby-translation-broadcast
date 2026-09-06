# Steg 3c: Fil-operativ källkodsspecifikation (TCK-017)

## 1. Berörda filer för domänen `src/features/live_translation/`
- `src/features/live_translation/domain/types.ts`
- `src/features/live_translation/domain/schema.ts`
- `src/features/live_translation/domain/audioResampler.ts`
- `src/features/live_translation/domain/tokenService.ts`
- `src/features/live_translation/domain/hotSwapManager.ts`
- `src/features/live_translation/domain/translationBridge.ts`
- `src/features/live_translation/hooks/useLiveTranslation.ts`
- `src/features/live_translation/components/LiveTranslationWidget.tsx`
- `src/features/live_translation/components/__tests__/LiveTranslationWidget.test.tsx`
- `src/features/live_translation/index.ts`
- `src/features/live_translation/doc/BUSINESS_RULES.md`
- `src/features/live_translation/doc/INTEGRATIONS.md`
- `src/features/live_translation/doc/INDEX.md`
- `src/features/live_translation/doc/UI_WORKFLOWS.md`

## 2. Testfall som ska skrivas först (TDD)
1. **Enhetstester för Audio Resampling & Frame Pacing:** Validera konvertering mellan 48kHz Float32 och 16kHz Int16 samt uppdelning i 480 samplar per 20ms block.
2. **Enhetstester för Hot-Swap & Session Resumption:** Validera att `resumptionHandle` sparas från `sessionResumptionUpdate` och att 14-minuters rotation triggas.
3. **UI- och interaktionstest (`LiveTranslationWidget.test.tsx`):** Validera rendering, statusväxling, språkval och knappinteraktioner (`fireEvent.click`) för tolkning och omedelbar panik-tystning.

BESLUT: GODKÄND
