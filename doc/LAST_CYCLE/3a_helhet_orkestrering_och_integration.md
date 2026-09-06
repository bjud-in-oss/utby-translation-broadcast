# Steg 3a: Helhet, orkestrering och integration (TCK-019)

## 1. Integrationsarkitektur
```text
[ Ljudkälla: NDI Webcam Input / Mikrofon (deviceId) ]
                       │ (48kHz Float32)
                       ▼
            [ AudioResampler ] -> (16kHz Int16 PCM)
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
[ TranslationBridge (sw) ]    [ TranslationBridge (es) ] ... (MultiBridgeOrchestrator)
       │                               │
  (24kHz PCM)                     (24kHz PCM)
       ▼                               ▼
[ LiveKit AudioTrack:           [ LiveKit AudioTrack:
  translator-sw ]                 translator-es ]
       │                               │
       └───────────────┬───────────────┘
                       ▼
             [ Mobilklient / Lyssnare ]
              (Selektiv uppspelning:
               Muta alla utom valt språk)
```

## 2. Identifiering och kanalseparation
Varje översättningsinstans tilldelas en distinkt identitet och track-namn:
- Identitet: `translator-[språkkod]` (t.ex. `translator-sw`, `translator-es`, `translator-ar`)
- Spårnamn: `translated-[språkkod]`
