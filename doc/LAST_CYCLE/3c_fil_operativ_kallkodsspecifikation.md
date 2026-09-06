# Steg 3c: Fil-operativ källkodsspecifikation

## 1. Berörda filer & Snapshots
- `src/App.tsx`
- `src/main.tsx`
- `src/index.css`
- `src/shared/index.ts`
- `src/shared/types/index.ts`
- `src/shared/templates/ai_zones/sanitizer.ts`
- `src/shared/templates/ai_zones/reasoner.ts`
- `src/shared/templates/ai_zones/executor.ts`
- `src/shared/templates/ai_zones/geminiServerZone.ts`
- `src/shared/templates/ai_zones/index.ts`
- `src/features/example_feature/components/ExampleWidget.tsx`
- `src/features/example_feature/components/__tests__/ExampleWidget.test.tsx`
- `src/features/example_feature/domain/types.ts`
- `src/features/example_feature/domain/exampleService.ts`
- `src/features/example_feature/hooks/useExample.ts`
- `src/features/example_feature/index.ts`

## 2. Testfall som ska skrivas först (TDD)
- Test för rendering och initialt läge.
- Test för användarinteraktion och knapptryck (`fireEvent.click`).

BESLUT: GODKÄND

