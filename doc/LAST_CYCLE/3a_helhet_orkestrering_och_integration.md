# Steg 3a: Helhet, orkestrering och integration (TCK-022)

## 1. Integrationsarkitektur
- `TranslationBridge`: Hanterar `reconnectAttempts` med exponential backoff på WebSocket-nivå.
- `useLiveTranslation`: Initierar och resume:ar `AudioContext` synkront vid startklick, samt kontrollerar `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `GEMINI_API_KEY` vid montering.
- `LiveTranslationWidget`: Visar `configWarning` om nycklar saknas och anropar `startTranslation` direkt i klickhanteraren.
