# Steg 4: Producera (TCK-009)

## Genomförande
Fas 1 i ROADMAP.md är genomförd: Klientens ljudmotor (`useAudioPlayer.ts`) har implementerats för mottagning, avkodning och sömlös uppspelning av tolkade ljudströmmar i realtid.

### Utförda ändringar
1. **TDD Enhetstester:**
   - `src/features/live_translation/hooks/__tests__/useAudioPlayer.test.ts`:
     - Testar export och tillgänglighet av `initAudio`, `playAudioChunk` och `stopAudio`.
     - Testar att `initAudio()` instansierar eller återupptar en suspended `AudioContext`.
     - Testar att `playAudioChunk()` avkodar Base64 Int16 PCM, skapar en mono 24kHz `AudioBuffer` och schemalägger uppspelning med en 40 ms jitterbuffert.
     - Testar omedelbar tystning (`stopAudio()`) av schemalagda noder.
     - Testar robust felhantering vid tomma eller ogiltiga dataströmmar.
2. **Källkod:**
   - `src/features/live_translation/hooks/useAudioPlayer.ts`:
     - Implementerad med Web Audio API och Reacts inbyggda hooks (`useRef`, `useCallback`, `useEffect`).
     - Konvertering av Base64 Int16 PCM till Float32AudioBuffer vid 24 000 Hz.
     - Tidsbaserad köhantering via `nextStartTime` med 40 ms jitterbuffert för hackfritt ljud.
     - Omedelbar avbrytning/panik-tystning av alla schemalagda ljudkällor vid `stopAudio()`.
     - Resursuppstädning vid unmount.
   - `src/features/live_translation/index.ts`:
     - Exponerar `useAudioPlayer` via fasaden.

## Verifiering
Samtliga enhetstester och arkitekturkontroller uppfyller FSD, TDD-ordning och typkrav utan anmärkningar.
