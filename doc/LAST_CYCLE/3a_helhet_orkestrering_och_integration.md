# Steg 3a: Helhet, orkestrering och integration (TCK-003)

- WebRTC/SFU Stream -> AudioResampler (downsample48kTo16k / clamping) -> 100 ms ramar -> TranslationBridge -> Gemini Live WebSocket.
- Gemini Live WebSocket -> 24 kHz Int16 -> AudioProcessor / Adaptive Slew -> Web Audio Destination.
- Cloudflare Calls REST API via /api/sfu/* proxy endpoints.
