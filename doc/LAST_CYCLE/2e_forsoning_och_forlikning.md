# Steg 2e: Försoning och förlikning (TCK-019)

## 1. Målkonflikter och förlikningsbeslut
- **Målkonflikt 1 (Enhetsåtkomst före beviljad behörighet):** `navigator.mediaDevices.enumerateDevices()` returnerar tomma `label`-strängar om mikrofonbehörighet inte beviljats ännu.
  - *Förlikning:* Hooken begär grundläggande enhetslista först och uppdaterar automatiskt etiketterna så snart behörighet ges vid första anrop eller interaktion.
- **Målkonflikt 2 (Flera WebSocket-strömmar samtidigt):** Att köra flera Gemini-bryggor parallellt ökar minnes- och nätverksbelastning.
  - *Förlikning:* `MultiBridgeOrchestrator` kapslar in varje instans med isolerad backpressure-kontroll och möjliggör att endast de specifikt valda språken hålls aktiva.
- **Målkonflikt 3 (UI-komplexitet och 120-radersbegränsning):** Många språk och enhetsval riskerar att spränga gränsen för `LiveTranslationWidget.tsx`.
  - *Förlikning:* Språkdata och grupperingar bryts ut helt till `domain/languages.ts`. Hooken `useLiveTranslation` levererar färdiga alternativ och hanterar logiken så att widgeten förblir deklarativ och kompakt (< 120 rader).

MÄTTNAD: JA
