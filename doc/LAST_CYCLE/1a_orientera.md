# Steg 1a: Orientera (TCK-017: live_translation)

## 1. Problembeskrivning & Målbild
Implementera realtids simultantolkning (röst-till-röst) för domänen `live_translation` (`src/features/live_translation/`) med stöd av Google Gemini Live Translate API (`gemini-3.5-live-translate-preview`) och LiveKit Cloud SFU WebRTC. Målet är att erbjuda en robust, låglatent tolkning med sömlös session-resiliens, säkra access-tokens, Web Audio-upptagning och stabil 3-stegs PCM-resampling.

## 2. Inblandade domäner
- `src/features/live_translation/`

## 3. Valda färdigheter & Referenser
Fem importerade delmoduler under `doc/skills/livekit_translation/`:
1. `gemini-live-translate` (WebSocket & Multimodal Live API)
2. `gemini-hot-swap-resiliency` (Resiliens, 14-min rotation, 20ms frame pacing, backpressure)
3. `gemini-livekit-translation-bridge` (3-stegs PCM-resampling 48kHz <-> 16kHz <-> 24kHz)
4. `livekit-server-tokens` (LiveKit v2 Server SDK, clock skew nbf -5s, VideoGrants)
5. `livekit-client-audio` (Web Audio capture, iOS Safari interrupted-hantering, DSP bypass)

---

## 4. Fokuserade GROW-frågor mot Risknoder

### GROW Fråga 1: State & Resilience (Sessionskontinuitet & Hot-Swap)
* **Goal:** Erbjuda oavbruten tolkning utan tidsgräns för lyssnare i LiveKit-rummet.
* **Reality:** Gemini Live API bryter anslutningen hårt vid 15 minuter (1000/1006 / `goAway`).
* **Options:** Naiv återanslutning (vilket kastar om WebRTC och ger tystnad/klick) kontra Zero-Downtime AudioSource Preservation där `AudioSource` hålls intakt medan en ny parallell WebSocket (`nextWs`) värms upp med `sessionResumption.handle` vid minut 14.
* **Way forward:** Implementera proaktiv 14-minuters timer och atomär socket-växling i domänens resilienslager.

### GROW Fråga 2: Contract & State (Åtkomsttokens & Säkerhet)
* **Goal:** Säkerställa auktoriserad anslutning till LiveKit SFU och Gemini Live Translate utan att läcka hemligheter till frontend.
* **Reality:** LiveKit Server SDK v2 kräver asynkron token-generering (`await at.toJwt()`). Klientklockor kan diffa och orsaka `401 Token not valid yet`. Gemini API-nycklar får aldrig exponeras i klientkod.
* **Options:** Statiska env-variabler i klienten (förkastas som säkerhetsrisk) kontra strikt backend-kontrakt med klock-skew (`nbf: -5s`), kort TTL (`15m`), differentierade `VideoGrants` (talare vs lyssnare) och backend-proxy / ephemeral tokens för Gemini.
* **Way forward:** Etablera Zod-validerade datakontrakt för tokenskapande och LiveKit room-anslutning.

### GROW Fråga 3: Effects & Audio pipeline (Resampling, Pacing & Backpressure)
* **Goal:** Skapa en kristallklar ljudström med låg latens (<2s) utan jitter, robotröst eller sessionskrascher.
* **Reality:** LiveKit levererar 48 kHz Float32; Gemini kräver 16 kHz Int16 Little-Endian och returnerar 24 kHz Int16 i asynkrona bursts; LiveKit kräver 480 samplar per 20 ms till WebRTC. Felaktiga fält (text/tools) under `translationConfig` utlöser WebSocket Error 1008/1011.
* **Options:** Rå sändning utan buffring kontra en renodlad ljudbro med minimal payload, linjär resampling, FIFO jitter ring-buffer med 20 ms frame pacing och backpressure-kontroll via `ws.bufferedAmount` (drop non-critical vid >128KB).
* **Way forward:** Bygga en renodlad, testbar audio-bridge-modul i domänen som isolerar dessa sidoeffekter.

---

```json
{
  "status": "IN_PROGRESS",
  "current_domain": "live_translation",
  "next_step": "1b_kartlagga",
  "ticket_id": "TCK-017",
  "active_skill": "gemini-livekit-translation-bridge"
}
```
