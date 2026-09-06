# Gemini & LiveKit Real-Time Translation Skills Collection

En samling modulära Agent Skills för att bygga produktionsredo, flerspråkiga och realtidöversatta ljudapplikationer med Google Gemini Live API (`gemini-3.5-live-translate-preview`) och LiveKit Cloud SFU.

## Innevarande Skills

| Skill | Beskrivning |
| :--- | :--- |
| **`gemini-live-translate`** | Regler, ephemeral tokens och anslutningsmönster för direktkommunikation med Gemini Live Translate API. |
| **`livekit-client-audio`** | Klientsidesljud i webbläsaren, Safari/iOS `interrupted`-återställning, spårfiltrering och inaktivering av lokal DSP. |
| **`livekit-server-tokens`** | Säker generering av JWT-tokens med LiveKit Server SDK v2 (`await at.toJwt()`), VideoGrants och clock-skew skydd (`nbf: -5s`). |
| **`gemini-livekit-translation-bridge`** | Server-side/lokal brygga för 3-stegs PCM-resampling (48kHz Float32 <-> 16kHz Int16 <-> 24kHz Int16) och backpressure. |
| **`gemini-hot-swap-resiliency`** | Produktionsresiliens: 14-minuters proaktiv session-rotation utan WebRTC-renegotiation, 20ms/480-samples frame pacing och payload-isolering mot fel 1008/1011. |
