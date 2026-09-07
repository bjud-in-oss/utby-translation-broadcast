# Steg 2b: Evaluera yttre anpassning (TCK-007)

## Utvärdering
1. **Utbytbarhet:** Tack vare kontraktet `AudioTransportAdapter` kan applikationen skifta mellan WebRTC SFU (`CloudflareSFUAdapter`) och `LocalWebSocketAdapter` utan förändringar i övrig domänlogik.
2. **Prestanda och GC:** Genom binär överföring (`arraybuffer`) och förallokerade buffertar undviks Garbage Collection-spikar under ljudströmning.
3. **Nätverksresiliens:** Backpressure-tröskel på 128 KB förhindrar ackumulering av sändköer under TCP-spikar.
