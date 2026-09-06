# Steg 3b: Domänkontrakt och fraktal dokumentation (TCK-021)

## 1. Domänkontrakt
- `AudioResampler.downsample48kTo16k(input: Float32Array): Int16Array`: Kontraktet bibehåller sin metodsignatur och returtyp. Lågpassfiltrering integreras internt.

## 2. Lokala dokumentationsfiler
- Uppdatera `src/features/live_translation/doc/BUSINESS_RULES.md` och `INTEGRATIONS.md` med specifikationen för anti-aliasing och enhetsbehörighet.
