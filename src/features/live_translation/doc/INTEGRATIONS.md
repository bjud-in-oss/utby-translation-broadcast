# Integrationsspecifikation

## 1. Gemini Live API WebSocket
- Endpoint: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`
- Modell: `models/gemini-3.5-live-translate-preview`
- Payload: Endast `translationConfig` och `responseModalities: ["AUDIO"]`.
- Felkoder 1008/1011 undviks genom att utesluta text, verktyg och systemprompt.

## 2. Cloudflare SFU & Lokal WebSocket
- Protokoll: WebRTC Cloudflare Calls SFU eller Lokal WS-brygga.
- SDK: Ren WebRTC / WebSocket-klient.
- Ljudspår publiceras som mono WebRTC MediaStreamTrack med dedikerad AudioProcessor.
- Parallella tolk-strömmar publicerar under identiteten `translator-[språkkod]`.
- Endast nödvändiga miljövariabler (`GEMINI_API_KEY`) valideras vid uppstart.

## 3. Web Audio & Enhetsinmatning
- `navigator.mediaDevices.enumerateDevices()` och `devicechange` hämtar alla ljudenheter och NDI.
- Anti-aliasing 3-punkts lågpassfiltrering dämpar vikningsbrus vid 48k -> 16k decimering.
- AudioContext körs med fallback-återstart vid Safari `interrupted`-status.
- DSP-filter inaktiveras selektivt vid ren talkälla.
