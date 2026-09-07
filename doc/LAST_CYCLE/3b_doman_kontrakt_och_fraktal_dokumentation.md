# Steg 3b: Domän, kontrakt och fraktal dokumentation (TCK-004)

## 1. Datatyper och Zod-kontrakt
- `QuotaLevel`: `"normal" | "warning_yellow" | "warning_red" | "hard_stop"`
- Trösklar:
  - Gul: 6 000 minuter
  - Röd: 8 000 minuter
  - Hårt stopp: 9 000 minuter
  - Månadsgräns: 10 000 minuter
- Formel: `(1 + interpreterTracks) * listeners * (1 / 60)` spårminuter per sekund.
- Persistensnyckel: `quota_usage_YYYY_MM`.
