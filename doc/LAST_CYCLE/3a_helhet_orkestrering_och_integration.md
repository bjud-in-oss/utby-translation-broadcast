# Steg 3a: Helhet, orkestrering och integration (TCK-017)

## 1. Systemarkitektur & Datavägar

```
[ Mikrofon / Web Audio ]
        │  (48kHz Float32 / getUserMedia utan DSP)
        ▼
[ AudioResampler ] ──▶ (16kHz Int16 Little-Endian mono, ~100ms)
        │
        ▼
[ TranslationBridge ] ──▶ (ws.bufferedAmount check < 128KB)
        │  WebSocket: wss://generativelanguage.googleapis.com/...
        ▼
[ Gemini Live Translate (gemini-3.5-live-translate-preview) ]
        │  (24kHz Int16 Little-Endian mono bursts)
        ▼
[ Jitter Ring Buffer & Metronome Dispatch (480 samplar / 20ms) ]
        │
        ▼
[ LiveKit AudioSource / LocalAudioTrack (48kHz Float32) ]
        │
        ▼
[ LiveKit SFU Room ──▶ Åhörare prenumererar på translation_<lang> ]
```

## 2. Orkestreringsroller och ansvarsfördelning
1. **`tokenService`**: Ansvarar för token-avtal. Tillhandahåller LiveKit room tokens (v2 SDK `await at.toJwt()`, `nbf: -5s`, TTL 15m) och ephemeral tokens.
2. **`audioResampler`**: Matematisk konvertering mellan float och 16-bit PCM i tre frekvenssteg (48 kHz, 16 kHz, 24 kHz).
3. **`translationBridge`**: Hanterar WebSocket-kommunikation mot Gemini Live API med ren setup-payload (inga textmeddelanden, inga verktyg, ingen systemprompt).
4. **`hotSwapManager`**: Övervakar sessionstid, sparar `resumptionHandle` från `sessionResumptionUpdate`, startar timer vid 14:00, pre-warmar parallell socket och genomför atomär växling.
5. **`useLiveTranslation`**: React Hook som exponerar sessionsmetoder, status, aktiva felkoder och statistik till UI-komponenter.
6. **`LiveTranslationWidget`**: FSD-komponent i `components/` som renderar widgeten med ren layout och tillgängliga reglage.
