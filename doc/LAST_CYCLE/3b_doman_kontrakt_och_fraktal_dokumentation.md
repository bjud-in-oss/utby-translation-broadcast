# Steg 3b: Domänkontrakt och fraktal dokumentation (TCK-022)

## 1. Domänkontrakt
- `TranslationBridge`:
  - `public connect(): Promise<void>`
  - Intern metod: `private attemptReconnect(): void`
  - Max försök: 3. Backoff-sekvens: 1000ms, 2000ms, 4000ms.
- `useLiveTranslation`:
  - Returobjekt utökas med `configWarning: string | null`.

## 2. Lokala dokumentationsfiler
- Uppdatera `src/features/live_translation/doc/BUSINESS_RULES.md`, `INTEGRATIONS.md` och `UI_WORKFLOWS.md`.
