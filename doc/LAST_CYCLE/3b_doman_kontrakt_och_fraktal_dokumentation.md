# Steg 3b: Domän, kontrakt och fraktal dokumentation (TCK-003)

- Domän: `live_translation`
- Kontrakt:
  - `TranslationBridge`: Ansluter WebSocket, hanterar BidiGenerateContent, 100 ms paketering, GoAway.timeLeft och hot swap.
  - `useCloudflareSFU`: WebRTC-koppling mot Worker-proxy, unmount-städning, synkron audio unlock.
  - `AudioProcessor.worklet`: Ringbuffert och elastic playback.
