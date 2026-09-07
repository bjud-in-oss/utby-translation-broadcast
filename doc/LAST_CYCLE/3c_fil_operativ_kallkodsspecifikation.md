# Steg 3c: Fil-operativ källkodsspecifikation (TCK-006)

## Berörda filer i Steg 4
Följande filer ska skapas/modifieras inom domänen `live_translation`:

1. `src/features/live_translation/domain/__tests__/transportAdapter.test.ts` (TDD Enhetstester med aktiva mockar och påståenden för AudioTransportAdapter och CloudflareSFUAdapter)
2. `src/features/live_translation/domain/types.ts` (Definition av `AudioTransportAdapter` och transportstatus)
3. `src/features/live_translation/domain/CloudflareSFUAdapter.ts` (Implementering av `AudioTransportAdapter` för Cloudflare Calls WebRTC)
4. `src/features/live_translation/hooks/useCloudflareSFU.ts` (Refaktorisering till att använda `CloudflareSFUAdapter`)
5. `src/features/live_translation/index.ts` (Export av `AudioTransportAdapter` och `CloudflareSFUAdapter`)
