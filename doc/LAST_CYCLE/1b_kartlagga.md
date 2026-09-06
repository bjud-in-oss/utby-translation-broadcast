# Steg 1b: Kartlägga (TCK-017: live_translation)

## 1. Besvarande av GROW-frågorna mot Risknoder

### Svar GROW 1 (State & Resilience):
* **State:** Sessionstillståndet hanteras i en central tillståndsklass (`TranslationBridgeSession`) som håller `sessionId`, `connectionStatus`, `activeLanguage`, `lastResumptionHandle` och en referens till `AudioSource`.
* **Resilience:** För att avvärja 15-minuters avbrottet implementeras en proaktiv timer vid minut 14:00. Vid utlösning pre-warmas en ny WebSocket (`nextWs`) med `sessionResumption: { handle: lastResumptionHandle }`. När `{ setupComplete: true }` tas emot, sker en atomär referensväxling (`this.ws = nextWs`) och den gamla socketen stängs. LiveKits `AudioSource` och det publicerade `LocalAudioTrack` förblir 100 % orörda, vilket garanterar noll avbrott för lyssnare.

### Svar GROW 2 (Contract & State):
* **LiveKit Token Contract:** Implementeras med `livekit-server-sdk` v2 via server-proxy eller dedikerad token-generator. Parametrar valideras med Zod: `roomName`, `identity`, `role` (`speaker` | `listener`), `language`. Token genereras asynkront (`await at.toJwt()`) med clock-skew buffert (`nbf: Math.floor(Date.now()/1000) - 5`) och kort TTL (`ttl: "15m"`).
* **Gemini Live API Contract:** Strikt isolering av setup-payloaden:
  ```json
  {
    "setup": {
      "model": "models/gemini-3.5-live-translate-preview",
      "generationConfig": {
        "responseModalities": ["AUDIO"],
        "translationConfig": {
          "targetLanguageCode": "sv",
          "echoTargetLanguage": false
        }
      },
      "realtimeInputConfig": {
        "automaticActivityDetection": { "disabled": true }
      }
    }
  }
  ```
  Textmeddelanden, verktyg och systemprompter förbjuds strikt för att förhindra fel 1008/1011.

### Svar GROW 3 (Effects & Audio Pipeline):
* **Web Audio Ingest:** Klienten använder `navigator.mediaDevices.getUserMedia` med inaktiverad DSP (`echoCancellation: false`, `noiseSuppression: false`, `autoGainControl: false` när externa källor används). På iOS Safari hanteras `statechange` till `interrupted` med automatisk `resume()` vid användarinteraktion.
* **Resampling:** Ljudet samplas om i tre distinkta steg:
  1. LiveKit In (48 kHz Float32) konverteras linjärt till 16 kHz Int16 Little-Endian mono (~100 ms chunks).
  2. Gemini genererar 24 kHz Int16 Little-Endian mono chunks.
  3. Konvertering från 24 kHz Int16 till 48 kHz Float32 innan matning till LiveKit `AudioSource`.
* **Frame Pacing & Backpressure:** Utgående Gemini-ljud placeras i en FIFO-kö (`Int16Array[]`). En metronomloop (var 20:e ms) plockar exakt 480 samplar och matar `AudioSource.captureFrame()`. Inmatningen övervakas via `ws.bufferedAmount` med ett tröskelvärde på 128 KB för att kasta icke-kritiska ramar vid nätverksstockning och skydda minnet.

---

## 2. Arkitekturkartläggning för domänen `src/features/live_translation/`

Struktur enligt Feature-Sliced Design (FSD):
```text
src/features/live_translation/
├── components/
│   ├── LiveTranslationWidget.tsx       # UI för start/stopp, språkval, status & indikatorer
│   └── __tests__/
│       └── LiveTranslationWidget.test.tsx # TDD-enhetstester med aktiva klick/interaktioner
├── domain/
│   ├── types.ts                        # Typer för session, ljudramar, språk och tokens
│   ├── schema.ts                       # Zod-scheman för körtidsvalidering av konfigurationer
│   ├── translationBridge.ts            # Huvudorkestrering av audio-bro och WebSocket
│   ├── audioResampler.ts               # 48kHz <-> 16kHz <-> 24kHz PCM-resampling
│   ├── tokenService.ts                 # Kontrakt för LiveKit och Gemini tokens
│   └── hotSwapManager.ts               # 14-minuters proaktiv rotation och session resumption
├── hooks/
│   └── useLiveTranslation.ts           # React-hook för sessionstillstånd och användarkontroll
└── index.ts                            # Explicita namngivna fasadexporter
```

---

```json
{
  "active_vectors": ["live_translation_bridge"],
  "status": "IN_PROGRESS",
  "current_domain": "live_translation",
  "next_step": "2a_forandra_utat_vision",
  "ticket_id": "TCK-017"
}
```
