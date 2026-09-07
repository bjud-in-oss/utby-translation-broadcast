# Steg 3c: Fil-operativ källkodsspecifikation (TCK-004)

## 1. Målfiler och moduler som modifieras eller skapas i Steg 4
Samtliga filer tillhör strikt domänen `src/features/live_translation/`:

1. `src/features/live_translation/domain/__tests__/quotaService.test.ts`
   - Enhetstester med aktiva `expect()`-påståenden före produktionskod.
   - Verifierar sekundförbrukningsformel `(1 + Tolkspår) * Lyssnare * (1 / 60)`.
   - Verifierar månadsspecifik nyckel `quota_usage_YYYY_MM` och automatisk nollställning vid månadsskifte.
   - Verifierar tregradig spärrlogik: Gul (6 000 min), Röd (8 000 min), HÅRT STOPP (9 000 min) med automatisk avstängningssignal och spärr mot nya anslutningar.

2. `src/features/live_translation/domain/quotaService.ts`
   - Ren TypeScript-domäntjänst utan React- eller DOM-beroenden.
   - Beräknar och ackumulerar spårminuter per sekund.
   - Persisterar till `localStorage` via dynamisk månadsnyckel med fallback till isolerad minneslagring.
   - Implementerar trösklar: 6 000 (gul), 8 000 (röd), 9 000 (hårt stopp).

3. `src/features/live_translation/domain/schema.ts`
   - Zod-scheman för `QuotaLevelSchema` och `QuotaUsageSchema`.

4. `src/features/live_translation/hooks/useQuotaGuard.ts`
   - Custom hook som hanterar 1-sekunds tick-loop, synk mot `QuotaService`, manuell växling av tolkspår och hårt stopp.

5. `src/features/live_translation/components/QuotaMeter.tsx`
   - Komponent för arrangörens kvotmätare i realtid med progressbar, aktuell förbrukning och knapp för tolkspårsavstängning vid varning.

6. `src/features/live_translation/components/LiveTranslationWidget.tsx`
   - Integrerar `useQuotaGuard` och `QuotaMeter`. Visar varningar och blockerande meddelande om sändningen stängts av p.g.a. nått kvottak.

7. `src/features/live_translation/components/__tests__/LiveTranslationWidget.test.tsx`
   - UI-enhetstester med interaktionspåståenden för kvotmätare, tolkspårsavstängning och kvotspärr.
