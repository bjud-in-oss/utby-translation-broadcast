# Steg 1a: Orientera (TCK-022: iOS WebAudio unlock, WebSocket retry backoff och credential-varning)

## 1. Problembeskrivning & Målbild
Införa tre optimeringar inför skarp live-sändning:
1. **iOS Safari Autoplay-spärr:** Säkerställa att WebAudio AudioContext låses upp (`audioCtx.resume()`) omedelbart i användarens synkrona klickhändelse före asynkrona `await`-anrop, så att mobiler på iOS inte förblir tysta.
2. **Resilient WebSocket-återanslutning (Exponential Backoff):** I `TranslationBridge.ts` införa automatisk återanslutning (3 försök med exponential backoff, t.ex. 1s, 2s, 4s) vid oväntat anslutningsbortfall över instabila konferensnätverk innan fel rapporteras.
3. **Validering av miljövariabler vid uppstart:** I `useLiveTranslation` och `LiveTranslationWidget` kontrollera förekomst av erforderliga konfigurationer och visa en tydlig varningsbanderoll om nycklar saknas.

## 2. Inblandade domäner
- `src/features/live_translation/`

## 3. Valda färdigheter & Referenser
- `livekit-client-audio` & WebSockets resilience

---

## 4. Fokuserade GROW-frågor mot Risknoder

### GROW Fråga 1: Effects (iOS Safari User Interaction Gesture)
* **Goal:** Garantera att ljud spelas upp på iOS-enheter (iPhone/iPad) utan att blockeras av Safaris autoplay-spärr.
* **Reality:** Safari kräver att `AudioContext.resume()` anropas i samma synkrona exekveringsstack som en användarinteraktion (t.ex. `onClick`). Om det sker efter ett asynkront anrop (t.ex. `await getUserMedia()`) nekar webbläsaren ljuduppspelning.
* **Options:** Skapa och resume:a AudioContext synkront i klickhanteraren kontra att göra det inuti `useLiveTranslation.startTranslation`.
* **Way forward:** Anropa `audioContextRef.current?.resume()` eller synkron upplåsning direkt vid klicket i `startTranslation`, och exponera en ren hanterare som körs omedelbart vid klicket.

### GROW Fråga 2: Resilience (WebSocket nätverksdippar & Backoff)
* **Goal:** Tolkningen ska överleva korta Wi-Fi-bortfall (1–4 sekunder) utan att avbrytas eller gå i felläge.
* **Reality:** För närvarande sätter `TranslationBridge` direkt status till `error` vid `ws.onerror` eller `ws.onclose`.
* **Options:** Omedelbar loop utan fördröjning kontra kontrollerad exponential backoff med max 3 försök.
* **Way forward:** Implementera `reconnectAttempts` med exponentiell backoff (1s, 2s, 4s) i `TranslationBridge` vid onormal stängning (close code !== 1000). Om återanslutningen lyckas återupptas sessionen sömlöst; först efter 3 misslyckade försök emitteras felstatus.

### GROW Fråga 3: State & Contract (Tidig miljövariabelvalidering)
* **Goal:** Informera användaren i gränssnittet om LiveKit- eller Gemini-nycklar saknas redan vid start, utan att krascha appen.
* **Reality:** Om nycklar saknas märks det först vid uppkopplingsförsök.
* **Options:** Hård krasch kontra informativ varning i hook och widget.
* **Way forward:** Låt `useLiveTranslation` kontrollera nycklar vid montering och tillhandahålla en tydlig `missingConfig`-signal som widgeten presenterar med ett minimalistiskt varningsfält.

---

```json
{
  "status": "IN_PROGRESS",
  "current_domain": "live_translation",
  "next_step": "1b_kartlagga",
  "ticket_id": "TCK-022",
  "active_skill": "livekit-client-audio"
}
```
