---
name: gemini-live-translate
description: Skapar, konfigurerar och integrerar realtids simultantolkning (röst-till-röst) med Gemini Live Translate (gemini-3.5-live-translate-preview). Använd vid talöversättning i realtid över WebSocket. Använd INTE för textchatt, konverserande agenter eller verktygsanrop.
---

# Gemini Live Translate – Instruktioner för AI-kodningsagent

## 1. KRAV: Mental modell & Begränsningar
* **Pipeline, inte chatt:** Modellen fungerar som en kontinuerlig tolk (streaming pipeline) med 1–3 sekunders eftersläpning. Konstruera inte svarslogik baserad på turtagning ("turns").
* **Endast ljudinmatning:** Skicka uteslutande PCM-ljud. Skicka ALDRIG textmeddelanden (`realtimeInput.text` eller `clientContent`) till denna modell – det bryter sessionen omedelbart.
* **Inga verktyg eller systeminstruktioner:** Lägg INTE till `tools`, `functionCalling`, Google Search eller `systemInstruction` när `translationConfig` används. API:et avvisar eller ignorerar dem.

---

## 2. KRAV: Modellidentifierare
Använd uteslutande följande modellnamn:
* **Officiellt ID:** `gemini-3.5-live-translate-preview`
* **Rå WebSocket-sökväg:** `models/gemini-3.5-live-translate-preview`

> **FÖRBUD:** Gissa ALDRIG på `gemini-2.0-flash-exp`, `gemini-2.5-flash` eller liknande. De stöder inte `translationConfig`.

---

## 3. KRAV: Ljudformat & Hårdvaruintegration
* **Input-ljud (Klient → Gemini):** Rå 16-bit PCM (Int16 Little-Endian), **16 000 Hz (16 kHz)**, mono (1 kanal). Skicka i block om ~100 ms (t.ex. 2048 samplar vid 44.1/48 kHz nersamplat till 16 kHz).
* **Output-ljud (Gemini → Klient):** Rå 16-bit PCM (Int16 Little-Endian), **24 000 Hz (24 kHz)**, mono.
* **FÖRBUD MOT LOKAL VAD/RMS:** Implementera ALDRIG lokal Voice Activity Detection (VAD) eller RMS-brusspärrar som klipper ljudströmmen vid tystnad. Skicka en 100 % oavbruten kontinuerlig ström. Modellen filtrerar själv brus och förblir tyst under pauser när `echoTargetLanguage: false`.
* **Koppla bort webbläsarens DSP vid mixer/NDI:** När du anropar `getUserMedia` för externa källor, headset eller NDI:
  ```javascript
  navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
      echoCancellation: false,
      autoGainControl: false,
      noiseSuppression: false
    }
  });
  ```

---

## 4. KRAV: Konfiguration (`translationConfig`)
Konfigurera setup-meddelandet exakt enligt följande struktur:
```json
{
  "setup": {
    "model": "models/gemini-3.5-live-translate-preview",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "inputAudioTranscription": {},
      "outputAudioTranscription": {},
      "translationConfig": {
        "targetLanguageCode": "sv",
        "echoTargetLanguage": false
      }
    }
  }
}
```
* `targetLanguageCode`: BCP-47 kod för målspråk (t.ex. `"sv"`, `"en"`, `"es"`, `"de"`, `"fr"`).
* `echoTargetLanguage`: Sätt till `false` vid tolkning för att förhindra att modellen upprepar tal som redan är på målspråket. Sätt till `true` endast om ekning uttryckligen efterfrågas.

---

## 5. KRAV FÖR WEB AUDIO: Uppspelningskö & Jitterbuffert
När du genererar frontend-kod för uppspelning MÅSTE du schemalägga chunks i `AudioContext` med en jitterbuffert på 40 ms samt implementera omedelbar avbrytning ("panik-tystning").

Använd exakt följande struktur:
```javascript
let playbackCtx = null;
let nextStartTime = 0;
let activeAudioSources = [];

function queueAudio24kHz(base64PcmData) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!playbackCtx || playbackCtx.state === 'closed') {
    playbackCtx = new AudioCtx({ sampleRate: 24000 });
    nextStartTime = playbackCtx.currentTime;
  }
  if (playbackCtx.state === 'suspended') {
    playbackCtx.resume();
  }

  // 1. Avkoda Base64 med säker byteOffset
  const binary = atob(base64PcmData);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  
  const sampleCount = Math.floor(bytes.length / 2);
  const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, sampleCount);

  // 2. Skapa AudioBuffer och normalisera till Float32
  const buf = playbackCtx.createBuffer(1, int16.length, 24000);
  const channelData = buf.getChannelData(0);
  for (let i = 0; i < int16.length; i++) channelData[i] = int16[i] / 32768.0;

  // 3. Schemalägg uppspelning med 40 ms jitterbuffert
  const source = playbackCtx.createBufferSource();
  source.buffer = buf;
  source.connect(playbackCtx.destination);

  const currentTime = playbackCtx.currentTime;
  if (nextStartTime < currentTime) {
    nextStartTime = currentTime + 0.04;
  }

  source.start(nextStartTime);
  nextStartTime += buf.duration;

  // 4. Registrera aktiv källa för omedelbar tystning vid stopp
  activeAudioSources.push(source);
  source.onended = () => {
    activeAudioSources = activeAudioSources.filter(s => s !== source);
  };
}

// Omedelbar tystning vid användarstopp
function stopAllAudioPlayback() {
  activeAudioSources.forEach(src => {
    try { src.stop(); } catch (_) {}
  });
  activeAudioSources = [];
  if (playbackCtx) nextStartTime = playbackCtx.currentTime;
}
```

---

## 6. KRAV: Djup JSON-validering för WebSocket
Vid mottagande av WebSocket-meddelanden MÅSTE du validera objektträdet defensivt:
* Kontrollera att `msg.serverContent` existerar.
* Kontrollera att `msg.serverContent.modelTurn?.parts` är en giltig array innan du loopar:
  ```typescript
  const parts = msg?.serverContent?.modelTurn?.parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (part?.inlineData?.data) queueAudio24kHz(part.inlineData.data);
      if (part?.text) handleTranscript(part.text, 'target');
    }
  }
  ```
* Läs `msg.serverContent.inputTranscription?.text` för talat källspråk och `msg.serverContent.outputTranscription?.text` för måltranskription.

---

## 7. KRAV FÖR SÄKERHET: Ephemeral Tokens
Exponera ALDRIG API-nyckeln i klientkod. Skapa en tillfällig token via backend mot `/v1beta/auth_tokens`.
* **MANDAT:** Skicka ALLTID med `uses: 1` och en giltig `expireTime` (t.ex. 30 minuter i framtiden) tillsammans med låsta `liveConnectConstraints`.

Exempelanrop i backend:
```json
POST https://generativelanguage.googleapis.com/v1beta/auth_tokens?key=API_KEY
Content-Type: application/json

{
  "uses": 1,
  "expireTime": "2026-09-05T13:30:00.000Z",
  "liveConnectConstraints": {
    "model": "models/gemini-3.5-live-translate-preview",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "translationConfig": {
        "targetLanguageCode": "sv",
        "echoTargetLanguage": false
      }
    }
  }
}
```

---

## 8. PROGRESSIV KODREFERENS
Läs respektive implementationsfil INNAN du genererar kod för den specifika tekniska miljön:

* **Rå WebSocket i Webbläsare (Låglatent):** Läs filen `assets/pattern-raw-ws.ts`.
* **TypeScript / Node.js med `@google/genai`:** Läs filen `assets/pattern-ts-sdk.ts`.
* **Python med `google-genai`:** Läs filen `assets/pattern-python-sdk.py`.
* **Säker Backend Ephemeral Tokens:** Läs filen `assets/pattern-ephemeral-tokens.ts`.

---

## 9. FELSÖKNINGSMATRIS & KANTFALL

| Fel / Symtom | Grundorsak | Obligatorisk åtgärd |
| :--- | :--- | :--- |
| **`404 Not Found` / `Model not supported`** | Felaktigt modellnamn i anropet. | Ändra till `gemini-3.5-live-translate-preview`. |
| **Sessionskrasch eller `Invalid argument`** | Textmeddelande, `tools` eller `systemInstruction` skickades. | Skicka enbart ljud-chunks. Ta bort alla verktyg och systeminstruktioner. |
| **Robotröst / Fel tonhöjd** | Fel samplingsfrekvens på PCM. | Säkerställ 16 kHz för mikrofoninmatning och 24 kHz för uppspelning. |
| **Första ordet i meningar saknas** | Lokal VAD/RMS klipper mikrofonen. | Ta bort all lokal brusspärr och strömma mikrofonen 100 % kontinuerligt. |
| **Översättning fortsätter spela efter stopp** | Köade Web Audio-källor körs klart. | Loopa igenom `activeAudioSources` och anropa `.stop()` på alla noder vid stopp. |
