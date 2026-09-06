# Steg 2b: Evaluera yttre anpassning (TCK-019)

## 1. Utvärdering mot användarbehov
- **NDI Webcam Input:** Eftersom NDI Webcam Input exponeras som en standard ljudinmatningsenhet i operativsystemet och webbläsaren, garanterar `enumerateDevices()` med `deviceId` att arrangören sömlöst kan välja NDI-strömmen utan extra plugins.
- **Flerspråkighet:** Möjliggör internationella sändningar där talaren pratar på ett språk och flera målgrupper kan lyssna på sitt modersmål (t.ex. Swahili, Spanska, Engelska) simultant.
- **Prestanda & Bandbredd:** Varje lyssnare tar endast emot sitt valda ljudspår och mutar de övriga för att spara lokal processorkraft.
