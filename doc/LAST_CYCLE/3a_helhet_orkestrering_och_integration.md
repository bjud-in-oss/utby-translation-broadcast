# Steg 3a: Helhet, orkestrering och integration (TCK-004)

## 1. Systemövergripande arkitektur
- `QuotaService` fungerar som domänens källsanning för spårkvotsberäkning och spärrstatus.
- `useQuotaGuard` kapslar tidsintervall (1 Hz), synkronisering mot `QuotaService` och händelsekedjan för automatiskt hårt stopp.
- `QuotaMeter` presenterar en visuell mätare, tröskelfärger och snabbåtgärd för tolkspårsavstängning.
- `LiveTranslationWidget` integrerar kvotskyddet och visar avstängningsmeddelande om kvottak uppnåtts.
