# Steg 1b: Kartlägga (TCK-008)

## Svar på GROW-frågor
1. **Contract & Constraints:** I `src/features/live_translation/hooks/useLiveTranslation.ts` definieras `MediaTrackConstraints` med `sampleRate: { ideal: 16000 }` (eller att `sampleRate` helt utelämnas från `audioConstraints`). För `deviceId` används flexibel matchning eller att `exact` endast appliceras vid explicit icke-standard val, så att webbläsaren inte kastar `OverconstrainedError` om hårdvaran inte stödjer 48 kHz eller exakta frekvenser.
2. **Effects & Resampling:** Web Audio API (`audioContext.createMediaStreamSource(stream)`) resamplar automatiskt från hårdvarans samplingsfrekvens till AudioContextens interna frekvens. Därefter hanterar `MicCapture.worklet.ts` (eller ljudpipelinen) paketering och nedskalning till 16 kHz PCM Int16 för vidare distribution till orchestrator och nätverksadaptrar.
3. **Resilience & State:** Vid fångstfel (`OverconstrainedError`, `NotAllowedError`, m.fl.) fångas felet i hookens try/catch, sätter `status` till `"error"` och sparar ett beskrivande felmeddelande i `error`. Enhetstester i `useLiveTranslation.test.ts` uppdateras för att verifiera att flexibla constraints skickas till `getUserMedia` samt att fel hanteras korrekt.

```json
{
  "active_vectors": [
    "audio_constraints_resilience"
  ]
}
```
