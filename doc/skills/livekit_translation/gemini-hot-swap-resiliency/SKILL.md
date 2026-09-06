---
name: gemini-hot-swap-resiliency
description: Produktionsmönster och resiliensarkitektur för Gemini Live API och LiveKit WebRTC-bryggor. Täcker sömlös hot-swap/session rotation vid minut 14 utan avbrott på AudioSource, 20ms/480-samples frame pacing, payload isolation mot 1008/1011-fel samt backpressure-hantering via bufferedAmount.
---

# Gemini Live API + LiveKit: Hot-Swap & Resiliens i Produktion

Denna skill dokumenterar fyra beprövade produktionstrick för realtidsöversättning och röstströmmar med **Gemini Live API (`BidiGenerateContent`)** och **LiveKit WebRTC (`@livekit/rtc-node`)**[cite: 27, 32].

Mönstren löser de fyra vanligaste produktionsproblemen:
1. **15-minuters session timeout** i Gemini Live API som klipper samtal[cite: 29].
2. **Audio popping, jitter och klick** orsakade av asynkrona burst-leveranser av PCM-ljud[cite: 26, 32].
3. **WebSocket 1008/1011-krascher** orsakade av ogiltiga fält i kombination med `translationConfig`[cite: 29, 32].
4. **Minnesläckage och latensexplosion** orsakad av brist på backpressure mellan WebRTC-ingest och WebSocket-egress[cite: 26, 34].

---

## 1. Hot-Swap / Session Rotation vid Minut 14

### Problemet
Gemini Live API:s WebSocket-sessioner har en hård gräns på maximal sessionslängd (normalt 15 minuter), varefter servern skickar ett `goAway`-meddelande eller stänger anslutningen med kod 1000/1006[cite: 26, 29].

Om applikationen naivt kopplar ifrån och skapar en ny `TranslationBridge`:
- LiveKit-rummet kopplas ner eller återansluts.
- LiveKits `LocalAudioTrack` och `AudioSource` förstörs och publiceras om.
- **Konsekvens:** Samtliga anslutna lyssnare drabbas av WebRTC renegotiation, tystnad, hörbara klick och tillfälligt avbrutna prenumerationer.

### Produktionslösningen: "Zero-Downtime AudioSource Preservation"
LiveKit-anslutningen, dess `AudioSource` och det publicerade `LocalAudioTrack` hålls **permanenta och oberörda**. Endast den underliggande Gemini WebSocket-pipen byts ut i bakgrunden:

```
[ LiveKit Room & Listeners ] 
          ▲
          │ (Oförändrad och oavbruten 24kHz ström)
   [ AudioSource / LocalAudioTrack ]
          ▲
          │ (Plockar från samma audioQueue)
  ┌───────┴───────┐
  │  geminiWs     │ (Aktiv WebSocket, min 0-14)
  │  nextWs       │ (Pre-warmas vid 14:00 med resumptionHandle)
  └───────────────┘
```

#### Flödesordning:
1. **Löpande Handle-caching:**
   Lyssna på Gemini-meddelandet `sessionResumptionUpdate`. Spara alltid det senaste `newHandle`:
   ```typescript
   if (message.sessionResumptionUpdate?.resumable && message.sessionResumptionUpdate.newHandle) {
     this.resumptionHandle = message.sessionResumptionUpdate.newHandle;
   }
   ```
2. **Proaktiv rotation vid 14:00 (eller reaktivt vid `goAway`):**
   Starta en timer på 14 minuter (`14 * 60 * 1000 ms`). Vänta inte på att Google stänger anslutningen vid minut 15[cite: 29].
3. **Pre-warm ny anslutning (`nextWs`):**
   Öppna en ny WebSocket parallellt.
4. **Skicka setup med resumptionHandle:**
   ```json
   {
     "setup": {
       "model": "models/gemini-3.5-live-translate-preview",
       "sessionResumption": { "handle": "<senaste_handle>" }
     }
   }
   ```
5. **Vänta på `setupComplete`:**
   Ta emot och bekräfta att `nextWs` svarar med `{ "setupComplete": true }`.
6. **Atomär referensväxling:**
   - Ersätt aktiv referens: `this.geminiWs = nextWs`.
   - Ta bort listeners och stäng gamla `oldWs`.
   - `AudioSource`, `LocalAudioTrack` och `audioQueue` förblir 100 % orörda.

---

## 2. Frame Pacing (480 samplar / 20ms per skrivning)

### Problemet
Gemini Live API levererar översatt PCM-ljud i asynkrona nätverksklumpar (bursts) av godtycklig längd (t.ex. 200–500 ms i ett enda paket)[cite: 27, 32]. 

Om hela bufferten skrivs direkt till LiveKits `AudioSource.captureFrame()`:
- WebRTC-sändarens interna jitterbuffert svämmar över eller underfylls[cite: 26, 39].
- Lyssnarna upplever metalliskt, robotliknande ljud, hackningar och fördröjningsryck[cite: 26, 39].

### Produktionslösningen: "Jitter Ring Buffer & Metronome Dispatch"
Gemini matar ut linjär PCM 16-bit mono med 24 000 Hz samplingsfrekvens[cite: 27].
Standard WebRTC transmissionsintervall är **20 ms**:

$$\text{Samplar per 20 ms} = 24\,000 \text{ Hz} \times 0{,}020 \text{ s} = 480 \text{ samplar (960 bytes)}$$

```
Gemini WS Chunk (t.ex. 2400 samplar)
               │
               ▼
      [ audioQueue: Int16Array[] ]
               │
   ┌───────────┴──────────────────────────────┐
   │ Pacing Loop (var 20:e ms)                │
   │ Plockar exakt 480 samplar ur kön         │
   │ skickar new AudioFrame(slice, 24000, 1)  │
   └───────────┬──────────────────────────────┘
               ▼
    AudioSource.captureFrame()
```

#### Regler för pacing-slingan:
1. Konvertera inkommande Base64-ljud direkt till `Int16Array` och lägg i `audioQueue`.
2. Kör ett intervall med `setInterval` var 20:e ms.
3. Plocka exakt 480 samplar (för 20ms @ 24kHz) från det aktuella chunk-segmentet.
4. Om kön är tom stängs intervall-loopen av tills nästa chunk anländer för att spara CPU.
5. Fånga eventuella `InvalidState`-fel om AudioSource stängs under nedkoppling.

---

## 3. Payload Isolation (Förbud mot text/tools under translationConfig)

### Problemet: WebSocket Error 1008 och 1011
När man ansluter till Gemini Live API och anger `translationConfig` i setup-meddelandet, dirigeras anslutningen till Googles specialoptimerade realtidsöversättningspipeline.

Denna pipeline har strikta restriktioner. Om klienten skickar standardfält som används i vanliga multimodala chattar:
- `systemInstruction` (systemprompter)
- `tools` (function declarations, code execution, search)
- `generationConfig.temperature` eller liknande genereringsparametrar
- Textmeddelanden i `realtimeInput`

Svarar Gemini-gatewayen omedelbart med:
- `1008 Policy Violation: Invalid configuration for translation mode`[cite: 29, 36]
- eller `1011 Internal Error` / session avbruten[cite: 29].

### Produktionslösningen: "Minimal Clean Payload"
Vid användning av `translationConfig` måste setup-payloaden isoleras strikt:

```json
{
  "setup": {
    "model": "models/gemini-3.5-live-translate-preview",
    "outputAudioTranscription": {},
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "translationConfig": {
        "targetLanguageCode": "es",
        "echoTargetLanguage": true
      }
    },
    "realtimeInputConfig": {
      "automaticActivityDetection": {
        "disabled": true
      }
    },
    "sessionResumption": {
      "handle": "<optional_resumption_handle>"
    }
  }
}
```

#### Kritiska regler:
- **Inget `systemInstruction`:** Modellen styrs uteslutande via `translationConfig.targetLanguageCode`.
- **Inga `tools`:** Fältet `tools` får inte ens finnas som tom array `[]`.
- **Inaktivera VAD:** Sätt `automaticActivityDetection: { disabled: true }` så att tal från föreläsaren inte avbryts eller kapas i förtid av Gemini[cite: 32].
- **Endast PCM-ljud i `realtimeInput`:** Skicka aldrig textprompter tillsammans med ljudet.

---

## 4. Backpressure-hantering via `bufferedAmount`

### Problemet
Talaren matar in audio i 48kHz via LiveKit i jämn takt. Om nätverket mellan Node.js-servern (t.ex. på Cloud Run) och Googles Gemini API upplever tillfällig paketfördröjning, samlas osläppta frames i WebSocket-klientens minne.

Utan backpressure:
- `ws.send()` fortsätter att anropas i 100ms-intervaller.
- Nod-processens minne (`RSS`) exploderar och triggar Cloud Run OOM (Out Of Memory).
- När proppen släpper matas gammalt ljud in och orsakar enorm latens och out-of-order-översättning.

### Produktionslösningen: "Threshold-based Ingestion Throttling"
WebSocket i Node.js (`ws`) exponerar egenskapen `bufferedAmount` som anger antalet bytes som väntar på att flushas till TCP-socketen[cite: 34].

```typescript
private sendAudioToGemini(frame: AudioFrame): void {
  if (!this.geminiWs || this.geminiWs.readyState !== WebSocket.OPEN) return;

  // 1. Backpressure guard: 128 KB motsvarar ~700ms 48kHz mono 16-bit PCM
  const MAX_BUFFERED_AMOUNT = 128 * 1024;

  if (this.geminiWs.bufferedAmount > MAX_BUFFERED_AMOUNT) {
    console.warn(
      `[Backpressure] Socket congested: ${this.geminiWs.bufferedAmount} bytes buffered. Dropping non-critical input frame.`
    );
    return;
  }

  // 2. Skicka ljudet säkert
  const pcmBuffer = Buffer.from(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength);
  this.geminiWs.send(JSON.stringify({
    realtimeInput: {
      audio: {
        mimeType: `audio/pcm;rate=${frame.sampleRate}`,
        data: pcmBuffer.toString("base64"),
      },
    },
  }));
}
```

---

## Sammanfattning av Resiliensregler

| Komponent | Produktionsmönster | Undviker |
| :--- | :--- | :--- |
| **Session Lifetime** | 14-minuters timer + `sessionResumption` + pre-warmed `nextWs` | 15 min cut-off, WebRTC renegotiation, lyssnaravbrott[cite: 29] |
| **Audio Playback** | FIFO Queue + 20ms / 480 samplar pacing loop | Audio clipping, robotröst, WebRTC buffer overflow[cite: 26, 39] |
| **Gemini Setup** | Payload Isolation (inga tools, ingen text, disabled VAD) | WebSocket error 1008 & 1011[cite: 29, 36] |
| **Audio Ingest** | `ws.bufferedAmount` threshold check | Minnesläckor, Cloud Run OOM, latensexplosion[cite: 34] |

För fullständig implementering i TypeScript, se referensmallen under `assets/pattern-hot-swap.ts`.
