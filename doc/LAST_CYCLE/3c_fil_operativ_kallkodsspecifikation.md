# Steg 3c: Fil-operativ källkodsspecifikation (TCK-022)

## 1. Berörda filer för domänen `src/features/live_translation/`
- `src/features/live_translation/domain/translationBridge.ts`
- `src/features/live_translation/domain/__tests__/translationBridge.test.ts`
- `src/features/live_translation/hooks/useLiveTranslation.ts`
- `src/features/live_translation/components/LiveTranslationWidget.tsx`
- `src/features/live_translation/components/__tests__/LiveTranslationWidget.test.tsx`
- `src/features/live_translation/doc/BUSINESS_RULES.md`
- `src/features/live_translation/doc/INTEGRATIONS.md`
- `src/features/live_translation/doc/UI_WORKFLOWS.md`

## 2. Testfall som ska köras först (TDD)
1. `src/features/live_translation/domain/__tests__/translationBridge.test.ts`:
   - Verifierar att återanslutning initieras med exponential backoff vid onormal WebSocket-stängning.
   - Verifierar att status inte övergår till `error` förrän efter 3 misslyckade försök.
2. `src/features/live_translation/components/__tests__/LiveTranslationWidget.test.tsx`:
   - Verifierar att `configWarning` visas i gränssnittet om miljövariabler saknas.
   - Verifierar att synkron upplåsning anropas vid klick på "Starta tolkning".

BESLUT: GODKÄND
