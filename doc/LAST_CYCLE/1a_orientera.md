# Steg 1a: Orientera (TCK-009)

## Mål
Implementera Fas 1 i ROADMAP.md: Klientens ljudmotor (`useAudioPlayer.ts`) för mottagning och sömlös uppspelning av 24kHz Mono 16-bit PCM-ljud (från Gemini Live API / serverrelay) med Web Audio API, tidsbaserad jitterbuffert (40 ms) och autoplay-upplåsning.

## GROW-frågor mot ändringens faktiska risknoder
1. **State & Scheduling (AudioContext & nextStartTime):** Hur upprätthålls `nextStartTime` och aktiva ljudkällor (`activeAudioSources`) så att inkommande diskreta Base64-ljudpaket schemaläggs utan glapp, knäppar eller drift, och hur återställs tidslinjen vid buffertunderflow eller omedelbart stopp?
2. **Contract & Conversion (Base64 Int16 PCM till Float32 AudioBuffer):** Hur valideras och konverteras Base64-strängen till `Int16Array` (med hänsyn tagen till byteOffset/längd) och därefter till en normaliserad `Float32Array` vid 24 000 Hz utan minnesläckage eller datakorruption?
3. **Resilience & Autoplay (Webbläsarens mediabegränsningar och resursstädning):** Hur hanteras autoplay-restriktioner via `initAudio()` vid användarinteraktion så att en avstängd (`suspended`) AudioContext återupptas omedelbart, och hur säkerställs omedelbar panik-tystning (`stopAudio()`) och uppstädning vid unmount?
