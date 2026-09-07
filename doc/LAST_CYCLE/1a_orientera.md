# Steg 1a: Orientera (TCK-004: Spårkvot och administrativ säkerhetsspärr)

## 1. Tre fokuserade GROW-frågor ställda mot faktiska risknoder

- **GROW 1 (State / Förbrukningsackumulering & Månadsväxling):** Hur beräknas och ackumuleras spårminuter per sekund med formeln `(1 + Tolkspår) * Lyssnare * (1 / 60)` och hur säkerställs att månadsnyckeln `quota_usage_YYYY_MM` i localStorage automatiskt nollställer räknaren vid månadsskifte utan race conditions?
- **GROW 2 (Contract / Tregradig Spärrlogik & Ren TS):** Hur utformas domäntjänsten `quotaService.ts` som ren TypeScript utan React- eller DOM-beroenden så att trösklarna för Gul (6 000 min), Röd (8 000 min) och HÅRT STOPP (9 000 min) kan testas och exekveras deterministiskt?
- **GROW 3 (Effects & Resilience / Automatisk Frånkoppling & UI):** Hur orkestreras ett omedelbart hårt stopp vid 9 000 spårminuter så att alla aktiva ljudströmmar bryts automatiskt, nya anslutningar spärras och arrangören ser realtidsstatus, varningar och manuell tolkspårsavstängning i `LiveTranslationWidget`?
