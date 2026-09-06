# Steg 1a: Orientera (TCK-021: AudioResampler anti-aliasing, enhetsbehörighet och ren röstinsignal)

## 1. Problembeskrivning & Målbild
Åtgärda identifierade kvalitetsbrister baserat på granskningen:
1. **AudioResampler (Ljudkvalitet & Aliasing):** Vid decimering från 48 kHz till 16 kHz behövs ett anti-aliasing lågpassfilter (moving average / 3-punkts box filter) för att eliminera metalliskt brus och frekvensvikning innan nedskalning till 16 kHz PCM för Gemini Live API.
2. **Enhetshantering för NDI / Mikrofoner:** Säkerställa att ljudenheter namnges och enumereras korrekt även innan och efter mikrofonbehörighet beviljats, samt proaktiv uppdatering via `devicechange`.
3. **Vite Tailwind v4 integration:** `@tailwindcss/vite` installerat och konfigurerat så att gränssnittet renderas med fullständiga Tailwind v4-stilar.

## 2. Inblandade domäner
- `src/features/live_translation/`

## 3. Valda färdigheter & Referenser
- `livekit-client-audio` & Web Audio API DSP

---

## 4. Fokuserade GROW-frågor mot Risknoder

### GROW Fråga 1: Contract & Resilience (AudioResampler DSP & Aliasing)
* **Goal:** Eliminera aliasing-artefakter och metalliskt brus vid nedkonvertering från 48 kHz till 16 kHz.
* **Reality:** Att välja var 3:e sampel direkt utan lågpassfilter skapar speglingsbrus över Nyquist-frekvensen (8 kHz).
* **Options:** Komplext FIR-filter kontra optimerad 3-punkts moving average / box-filter.
* **Way forward:** Applicera ett 3-punkts rullande medelvärde `(input[idx] + input[idx+1] + input[idx+2]) / 3` över samplen innan konvertering till Int16. Detta dämpar höga frekvenser effektivt med $O(N)$ linjär prestanda och noll extra minnesallokering.

### GROW Fråga 2: State & Effects (Enhetshantering och behörighet)
* **Goal:** Säkerställa att NDI Webcam Input och fysiska mikrofoner alltid får meningsfulla namn och uppdateras dynamiskt.
* **Reality:** `navigator.mediaDevices.enumerateDevices()` returnerar `label: ""` om användaren ännu inte beviljat behörighet i webbläsaren.
* **Options:** Blockera gränssnittet kontra att tillhandahålla en tydlig initial lista och automatiskt uppdatera med fullständiga namn när mikrofontillgång beviljas vid start.
* **Way forward:** Förbättra enhetsenumereringen med proaktiv fallback, tydlig märkning och omedelbar omläsning när strömmen öppnas samt lyssna på `devicechange`.

### GROW Fråga 3: Interface & Architecture (Rad- och hookbegränsningar)
* **Goal:** Säkerställa att alla förbättringar i `useLiveTranslation` och `LiveTranslationWidget` respekterar max 120 rader och max 3 hooks.
* **Reality:** `LiveTranslationWidget` har för närvarande ca 110 rader och anropar endast 1 hook.
* **Options:** Bygga in komplex behörighetslogik i widgeten kontra att inkapsla logiken rent i `useLiveTranslation`-hooken.
* **Way forward:** Håll widgeten ren och deklarativ, inkapsla enhets- och filtreringslogik i domän och hook.

---

```json
{
  "status": "IN_PROGRESS",
  "current_domain": "live_translation",
  "next_step": "1b_kartlagga",
  "ticket_id": "TCK-021",
  "active_skill": "livekit-client-audio"
}
```
