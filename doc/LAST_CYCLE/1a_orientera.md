# Steg 1a: Orientera (TCK-008)

## Mål
Åtgärda `OverconstrainedError` vid ljudfångst i domänen `live_translation` genom att mjuka upp hårt ställda krav i anropet till `navigator.mediaDevices.getUserMedia` i `src/features/live_translation/hooks/useLiveTranslation.ts`. Strikta hårdvarukrav på samplingsfrekvens ersätts med flexibla krav (`sampleRate: { ideal: 16000 }` eller avlägsnas ur constraints), medan WebAudio och AudioWorklet hanterar intern resampling.

## GROW-frågor mot ändringens faktiska risknoder
1. **Contract & Constraints (MediaTrackConstraints och ljudfångstkontrakt):** Hur ska parametrarna i `navigator.mediaDevices.getUserMedia` utformas så att strikta hårdvarukrav (t.ex. fasta sample rates eller `exact`) ersätts med flexibla preferenser (`sampleRate: { ideal: 16000 }` eller utelämnad `sampleRate`), och hur säkerställs att enhetsval via `deviceId` sker utan att utlösa `OverconstrainedError` på enheter med begränsat hårdvarustöd?
2. **Effects & Resampling (AudioContext & Worklet-bearbetning):** Hur interagerar den erhållna ljudströmmen från `getUserMedia` med `AudioContext` och `MicCapture.worklet.ts` när hårdvaran levererar godtycklig nativ samplingsfrekvens (t.ex. 44.1 kHz, 48 kHz eller 96 kHz), och hur garanteras att resampling och 100 ms ramindelning sker stabilt utan latency-ackumulering?
3. **Resilience & State (Felhantering och testbarhet):** Hur säkerställs att `useLiveTranslation` och tillhörande enhetstester i `useLiveTranslation.test.ts` validerar de mjukare kraven samt graciöst hanterar eventuella nekade behörigheter eller hårdvarufel med korrekt uppdatering av hookens fel- och statusläge (`status: "error"`, `error: string`)?
