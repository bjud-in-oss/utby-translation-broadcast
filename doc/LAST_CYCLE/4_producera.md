# Steg 4: Producera (TCK-008)

## Genomförande
`OverconstrainedError` vid ljudfångst i domänen `live_translation` har åtgärdats genom att mjuka upp kraven i anropet till `navigator.mediaDevices.getUserMedia`.

### Utförda ändringar
1. **TDD Enhetstester:**
   - `src/features/live_translation/hooks/__tests__/useLiveTranslation.test.ts`:
     - Verifierar att `getUserMedia` anropas med `sampleRate: { ideal: 16000 }` istället för tvingande hårdvarufrekvenser.
     - Verifierar att vald mikrofon skickas med flexibla constraints (`deviceId: { ideal: selectedDeviceId }`).
     - Verifierar graciös hantering av `OverconstrainedError` där felet fångas och hookens status sätts till `error` med felbeskrivning.
2. **Källkod:**
   - `src/features/live_translation/hooks/useLiveTranslation.ts`:
     - Ändrat `sampleRate` i `audioConstraints` från fast `48000` till `{ ideal: 16000 }`.
     - Ändrat `deviceId` från `{ exact: selectedDeviceId }` till `{ ideal: selectedDeviceId }` för att undvika OverconstrainedError på mikrofoner/ljudkort.

## Verifiering
Samtliga tester i `useLiveTranslation.test.ts` passerar utan anmärkningar. Linjekvoter (<250 rader per fil), typkrav (inga any) och TDD-ordning uppfylls.
