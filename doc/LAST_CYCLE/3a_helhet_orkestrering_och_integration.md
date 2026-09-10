# Steg 3a: Helhet, orkestrering och integration (TCK-009)

## Integration
`useAudioPlayer` integreras i domänen `live_translation`.
Framtida mottagarkomponenter (`Watch.tsx`) konsumerar hooken för att spela upp de ljudpaket som levereras från relay-servern eller Gemini Live API över WebSocket.
