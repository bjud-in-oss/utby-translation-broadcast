# Steg 1b: Kartlägga (TCK-009)

## Svar på GROW-frågor
1. **State & Scheduling:** `useAudioPlayer` använder `useRef` för `AudioContext`, `nextStartTime` och en array av aktiva `AudioBufferSourceNode`. Vid schemaläggning kontrolleras `if (nextStartTime < currentTime)` och justeras till `currentTime + 0.04` (40 ms jitterbuffert enligt sektion 5 i `doc/skills/gemini-live-translate/SKILL.md`). Vid varje chunk ökas `nextStartTime` med buffertens varaktighet.
2. **Contract & Conversion:** Inkommande Base64 avkodas med `atob()` till `Uint8Array`. En `Int16Array` skapas över datan och en mono `AudioBuffer` genereras med `sampleRate: 24000`. Värdena normaliseras från Int16 [-32768, 32767] till Float32 [-1.0, 1.0] genom division med 32768.0.
3. **Resilience & Autoplay:** `initAudio()` instansierar eller anropar `playbackCtx.resume()` vid klick/gest. `stopAudio()` stoppar alla schemalagda källor omedelbart och återställer `nextStartTime`. Hookens unmount-effekt anropar `stopAudio()` och stänger/rensar ljudkontexten säkert utan minnesläckage.

```json
{
  "active_vectors": [
    "client_audio_player"
  ]
}
```
