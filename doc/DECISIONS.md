# Systembeslut & Arkitekturregler (doc/DECISIONS.md)

- **ADR-001 (FSD & Fasadgränser)**: All domänkod samlas under `src/features/[domän]/`. Exponering sker uteslutande via namngivna exporter i `index.ts`. Djupimport är förbjuden.
- **ADR-002 (Körtidsminne & RAM-arkitektur)**: Node.js-containern kör tillståndslöst. Inga sessionsfiler eller hemligheter skrivs till disk. Allt tillstånd hålls i RAM eller Firestore.
- **ADR-003 (Kontraktsverifiering & Zod)**: All datavalidering sker via deklarativa, exekverbara Zod-scheman i `domain/schema.ts`. Alla gränssnitt frysta i `types.ts`.
- **ADR-004 (Lagerseparering)**: Strikt trelagershierarki: `src/shared/` (klienttyper/i18n), `src/main/services/` (backendinfrastruktur) och `src/features/` (UI-domäner).
- **ADR-005 (Storleksgränser & Modularitet)**: Filer i `src/` får ha max 250 rader. UI-huvudvyer utanför `components/` får ha max 120 rader.
- **ADR-006 (Fysiskt processminne)**: Processen drivs sekventiellt via diskfiler i `doc/LAST_CYCLE/` (1a -> 3c -> token -> 4).
- **ADR-007 (Samlokaliserad dokumentation)**: Domändokumentation samlas under `src/features/[domän]/doc/CONSTRAINTS.md` och begränsas till max 40 rader punktlistor.
- **ADR-008 (Mekanisk verifieringsspärr)**: Källkod och arkitektur valideras deterministiskt via `npm run verify` (`scripts/verify-architecture.js`).
- **ADR-009 (Renodlade fasader)**: `index.ts` får enbart innehålla re-export-satser (`export { ... }`), ingen inline-affärslogik.
- **ADR-010 (Maskinläsbar 1a-status)**: `1a_orientera.md` avslutas alltid med ett validerat JSON-block (status, current_domain, next_step, ticket_id, active_skill).
- **ADR-011 (Gränssnittsskydd)**: Källkodssnapshots i `pre_step4/` kontrollerar att props inte försvinner utan explicit `BORTTAGEN_PROP` i 3c.
- **ADR-012 (Vy-modularisering)**: UI-vyer begränsas till max 120 rader. Komponenter får ha max 3 hooks (useState/useEffect); överskjutande logik bryts ut till custom hooks.
- **ADR-013 (Tidsstämpelhantering & Gate)**: Strikt sekventiell mtime-kontroll och mänsklig verifieringskod (`REQUIRED_TOKEN.txt` / `APPROVAL.md`).
- **ADR-014 (Trygg självläkning)**: Vid verifieringsfel görs ett nytt heltäckande svep 1a–3c på disken.
- **ADR-015 (Fil-snapshots)**: Ögonblicksbilder skapas automatiskt före Steg 4 för säker regressionstestning och återställning.
- **ADR-016 (Beteendedrivna UI-tester)**: `.test.tsx`-filer kräver aktiva interaktionspåståenden (`fireEvent`, `userEvent`, `click`).
- **ADR-017 (Tidsåtskild granskning)**: Fas 1 (1a–3c) stannar för användargodkännande med token innan Fas 2 (Steg 4) påbörjas.
