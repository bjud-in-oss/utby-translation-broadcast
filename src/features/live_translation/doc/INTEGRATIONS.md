# Integrationsspecifikation

## 1. Gemini Live API WebSocket
- Endpoint: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`
- Modell: `models/gemini-3.5-live-translate-preview`
- Payload: Endast `translationConfig` och `responseModalities: ["AUDIO"]`.
- Felkoder 1008/1011 undviks genom att utesluta text, verktyg och systemprompt.

## 2. LiveKit Cloud SFU
- URL-protokoll: `wss://...livekit.cloud`
- SDK: `livekit-client` v2
- Ljudspår publiceras som mono `LocalAudioTrack` med dedikerad `AudioSource`.
- Parallella tolk-bottar publicerar under identiteten `translator-[språkkod]`.
- Tokens genereras med klock-skew (`nbf: -5s`) och 15 minuters giltighetstid.

## 3. Web Audio & Enhetsinmatning
- `navigator.mediaDevices.enumerateDevices()` hämtar alla ljudenheter och NDI.
- AudioContext körs med fallback-återstart vid Safari `interrupted`-status.
- DSP-filter inaktiveras selektivt vid ren talkälla.
