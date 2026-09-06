# Steg 3c: Fil-operativ källkodsspecifikation (TCK-019)

## 1. Berörda filer för domänen `src/features/live_translation/`
- `src/features/live_translation/domain/languages.ts`
- `src/features/live_translation/domain/types.ts`
- `src/features/live_translation/domain/schema.ts`
- `src/features/live_translation/domain/multiBridgeOrchestrator.ts`
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
1. **Ljudingångstest & Enhetsval:** Verifiera att `LiveTranslationWidget` listar inmatningsenheter (inkl. NDI-källor) och reagerar på ändring av `deviceId` via `fireEvent.change`.
2. **Flerspråkstest & Swahili:** Verifiera att det utökade språkbiblioteket (inkl. Swahili `sw`) renderas korrekt och kan väljas.
3. **Parallell orkestrering & selektiv lyssning:** Verifiera att start/stopp av simultana språkbryggor och selektiv tystning fungerar via UI-interaktioner.

BESLUT: GODKÄND
