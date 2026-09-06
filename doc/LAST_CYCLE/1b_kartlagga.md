# Steg 1b: Kartlägga (TCK-022: iOS WebAudio unlock, WebSocket retry backoff och credential-varning)

## 1. Besvarande av GROW-frågorna mot Risknoder

### Svar GROW 1 (iOS Safari Autoplay Unlock):
I `useLiveTranslation.ts` och `LiveTranslationWidget.tsx` säkerställs att ett eventuellt existerande `AudioContext` eller ett nytt direkt anropas med `.resume()` synkront i `startTranslation`-metoden, innan `await navigator.mediaDevices.getUserMedia(...)` exekveras. På så vis godkänns ljuduppspelningen av iOS Safaris gesture-kontroll.

### Svar GROW 2 (Resilient WebSocket Reconnect med Exponential Backoff):
I `TranslationBridge.ts` implementeras:
- `reconnectAttempts: number = 0;` (max 3 försök).
- Vid `ws.onclose` där `code !== 1000` (normal close) och sessionen inte avsiktligt stoppats anropas `attemptReconnect()` med fördröjning $1000 \times 2^{\text{attempts}}$ ms (1s, 2s, 4s).
- Vid lyckad återanslutning återställs `reconnectAttempts = 0`.
- Endast efter att 3 försök misslyckats sätts status till `error`.

### Svar GROW 3 (Validering av miljövariabler vid uppstart):
I `useLiveTranslation.ts` kontrolleras vid montering om API-nyckel eller LiveKit-URL saknas:
- Om konfiguration saknas sätts `configWarning: string | null` (t.ex. "Miljövariabler för Gemini/LiveKit saknas (.env.local)").
- `LiveTranslationWidget.tsx` renderar ett diskret, monospacat varningsmeddelande i redaktionell stil om `configWarning` är satt, så användaren vet att sändning förutsätter konfiguration.

---

## 2. Arkitekturkartläggning för berörda filer

```text
src/features/live_translation/
├── domain/
│   ├── translationBridge.ts # Reconnect exponential backoff
│   └── __tests__/
│       └── translationBridge.test.ts # Reconnect logiktester
├── hooks/
│   └── useLiveTranslation.ts # Synkron iOS AudioContext unlock & tidig credential check
├── components/
│   ├── LiveTranslationWidget.tsx # Presentation av varningsbanderoll och synkron start
│   └── __tests__/
│       └── LiveTranslationWidget.test.tsx # UI-tester
├── doc/
│   ├── BUSINESS_RULES.md
│   ├── INTEGRATIONS.md
│   └── UI_WORKFLOWS.md
```

---

```json
{
  "active_vectors": ["resilience_reconnect_ios"],
  "status": "IN_PROGRESS",
  "current_domain": "live_translation",
  "next_step": "2a_forandra_utat_vision",
  "ticket_id": "TCK-022"
}
```
