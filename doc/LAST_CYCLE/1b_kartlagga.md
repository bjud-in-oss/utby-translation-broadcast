# Steg 1b: Kartlägga (TCK-004: Spårkvot och administrativ säkerhetsspärr)

## 1. Besvarande av GROW-frågorna mot Risknoder

### Svar GROW 1 (State / Förbrukningsackumulering & Månadsväxling):
Sekundförbrukningen beräknas som `(1 + interpreterTracks) * listeners * (1 / 60)`. Ackumulerad förbrukning sparas i localStorage under nyckeln `quota_usage_YYYY_MM` (t.ex. `quota_usage_2026_09`). Vid byte av månad adresseras automatiskt en ny nyckel vilket leder till en ren nollställning vid varje månadsskifte utan migrationsskript.

### Svar GROW 2 (Contract / Tregradig Spärrlogik & Ren TS):
`QuotaService` implementeras som en ren TypeScript-klass utan React/DOM-beroenden. Den accepterar en valfri `StorageLike`-adapter (default till `localStorage` om tillgänglig eller in-memory för isolerade tester). Den exponerar nivåerna `normal`, `warning_yellow` (>= 6 000), `warning_red` (>= 8 000) och `hard_stop` (>= 9 000).

### Svar GROW 3 (Effects & Resilience / Automatisk Frånkoppling & UI):
När ackumulerad förbrukning når 9 000 minuter triggas `hard_stop`. `useQuotaGuard`-hooken lyssnar på förändringen och anropar `stopTranslation()` för att omedelbart stänga audio-pipelines och WebSocket. Ny anslutning blockeras. Arrangören presenteras med mätare, förvarningar med möjlighet att stänga av tolkspår vid 6 000 minuter, samt ett tydligt felmeddelande vid hårt stopp.

---

```json
{
  "active_vectors": ["admin_quota_guard"],
  "status": "IN_PROGRESS",
  "current_domain": "live_translation",
  "next_step": "2a_forandra_utat_vision",
  "ticket_id": "TCK-004"
}
```
