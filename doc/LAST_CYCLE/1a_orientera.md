# Steg 1a: Orientera (TCK-019: Enhetsval, parallell tolkning & utökat språkbibliotek)

## 1. Problembeskrivning & Målbild
Utöka domänen `src/features/live_translation/` med tre centrala förmågor:
1. **Enhetsval för ljudingång (NDI Webcam Input):** Dynamisk enumerering av ljudenheter via `navigator.mediaDevices.enumerateDevices()`, dropdown i arrangörsvyn och anslutning med explicit `deviceId`.
2. **Parallell flerspråksöversättning:** Orkestrering av multipla parallella `TranslationBridge`-instanser där varje brygga publicerar sin översatta ström under egen identitet (`translator-[språkkod]`). I lyssnar-/mobilvyn spelas endast det valda språkets röst upp medan övriga tystas automatiskt.
3. **Maximalt utökat språkbibliotek:** Skapa `languages.ts` och uppdatera Zod-scheman med ett globalt bibliotek (Swahili `sw`, Somaliska `so`, Amhariska `am`, Nordiska, Europeiska, Mellanöstern och Asiatiska språk).

## 2. Inblandade domäner
- `src/features/live_translation/`

## 3. Valda färdigheter & Referenser
- `gemini-livekit-translation-bridge` & `livekit-client-audio`

---

## 4. Fokuserade GROW-frågor mot Risknoder

### GROW Fråga 1: Contract & State (Enhetsval & NDI Audio)
* **Goal:** Möjliggöra val av virtuell eller fysisk ljudingång (t.ex. "NDI Webcam Input") via `enumerateDevices()` och skicka valt `deviceId` till ljudströmmen och LiveKit.
* **Reality:** Befintlig hook begär hårdkodat standardmikrofon utan `deviceId`-filtrering. Enhetsbehörighet måste beviljas innan etiketter (labels) exponeras av webbläsaren.
* **Options:** Enumerera vid varje render (prestandaproblem) kontra engångs- eller behörighetsstyrd enumerering vid montering/tillståndsändring sparad i stabilt hook-tillstånd.
* **Way forward:** Implementera `getAudioInputDevices()` i hooken som anropar `enumerateDevices()`, filtrerar på `audioinput`, och sparar lista av enheter `{ deviceId, label }` samt låter användaren välja aktiv enhet.

### GROW Fråga 2: Resilience & Orchestration (Parallell flerspråksöversättning)
* **Goal:** Köra multipla samtidiga `TranslationBridge`-sessioner i bakgrunden för olika målspråk (`translator-sw`, `translator-es`, etc.) och låta lyssnaren selektivt prenumerera/avmuta enbart vald kanal.
* **Reality:** Nuvarande brygga hanterar ett språk i taget. Flera samtidiga WebSocket-bryggor kräver isolerad backpressure-hantering och hantering av AudioTrack-prenumerationer.
* **Options:** En gigantisk sammankopplad brygga kontra en dedikerad `MultiBridgeOrchestrator` som sköter poolen av `TranslationBridge`-instanser per språkkod och en ren lyssnarhook för selektiv uppspelning.
* **Way forward:** Skapa `multiBridgeOrchestrator.ts` som hanterar en karta av `TranslationBridge`-instanser per språkkod, och ge lyssnaren en selektiv ljudväljare som automatiskt mutar/avprenumererar icke-valda spår.

### GROW Fråga 3: Contract & Data (Utökat språkbibliotek inkl. Swahili)
* **Goal:** Erbjuda fullständig täckning av efterfrågade språk (Swahili, Somaliska, Amhariska, Nordiska, Väst/Syd/Östeuropeiska, Mellanöstern, Asien) med strikt körtidsvalidering via Zod.
* **Reality:** Nuvarande `SupportedLanguage` stöder endast 7 hårdkodade språk (`sv`, `en`, `es`, `de`, `fr`, `ja`, `zh`).
* **Options:** Inlinea 30+ språksträngar i flera filer (risk för divergens) kontra att skapa `domain/languages.ts` med ett strukturerat språkregister, kategorisering och Zod-schema som exporteras genom fasaden.
* **Way forward:** Skapa `domain/languages.ts` med fullständiga språkdefinitioner, koder, flaggor/regioner och Zod-scheman som konsumeras av både UI och domänbroar.

---

```json
{
  "status": "IN_PROGRESS",
  "current_domain": "live_translation",
  "next_step": "1b_kartlagga",
  "ticket_id": "TCK-019",
  "active_skill": "gemini-livekit-translation-bridge"
}
```
