# Steg 3b: Domän, kontrakt och fraktal dokumentation (TCK-006)

## Kontrakt
- `src/features/live_translation/domain/types.ts`:
  - `AudioTransportStatus = 'disconnected' | 'connecting' | 'connected' | 'error'`
  - `AudioTransportAdapter`: Gränssnitt för ljudtransport.
- `src/features/live_translation/domain/CloudflareSFUAdapter.ts`:
  - Implementerar `AudioTransportAdapter` för Cloudflare Calls.
- `src/features/live_translation/hooks/useCloudflareSFU.ts`:
  - Konsumerar adaptern.
