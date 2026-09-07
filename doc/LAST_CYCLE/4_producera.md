# Steg 4: Producera (TCK-004)

## Genomförd implementation
1. **TDD-exekvering i Fas 2 (Steg 4):**
   - Skapade `src/features/live_translation/domain/__tests__/quotaService.test.ts` med explicita `expect()`-påståenden *före* produktionskoden.
   - Verifierade formeln för sekundförbrukning: `(1 + Tolkspår) * Lyssnare * (1 / 60)`.
   - Verifierade dynamisk månadsnyckel `quota_usage_YYYY_MM` och automatisk nollställning vid månadsskifte.
   - Verifierade tregradig spärrlogik: Gul (6 000 min), Röd (8 000 min), HÅRT STOPP (9 000 min, 10 % buffert till Cloudflare 10 000 min limit).
   - Uppdaterade `LiveTranslationWidget.test.tsx` med interaktionstester för realtidsmätare, bortkoppling av tolkspår och hårt stopp.

2. **QuotaService (Ren TS):**
   - Implementerade `src/features/live_translation/domain/quotaService.ts` som ren TypeScript utan React- eller DOM-beroenden.
   - Stöd för flexibel `StorageLike`-adapter (standardiserad mot webbläsarens `localStorage` och in-memory fallback för isolerad körning).
   - Exponerade callbacks och deterministiska beräkningsfunktioner.

3. **Orkestrering och Gränssnitt:**
   - Skapade `useQuotaGuard`-hooken för 1-sekunds intervall-ackumulering, synkronisering mot servicen och automatisk avstängning vid nådd gräns.
   - Skapade `QuotaMeter`-komponenten för visuell mätare, tröskelfärger och snabbknapp för att koppla från tolkspår vid förvarning.
   - Integrerade i `LiveTranslationWidget` med avstängningsmeddelande och spärr mot att starta ny session när kvottaket nåtts.

4. **Arkitektur och Typsäkerhet:**
   - Inga importer från `@livekit/rtc-node` eller `deprecated/`.
   - Eliminerade `any`, tomma catch-block och höll samtliga filer strikt under 250 rader.
   - Exporterade Zod-scheman i `domain/schema.ts`.
