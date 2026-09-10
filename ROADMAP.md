# 🗺️ ROADMAP: Utvecklingsfaser

- [ ] **Fas 1: Ljudmotor i Klient (`useAudioPlayer.ts`)**
  - [ ] Skapa React-hook för avkodning av Base64-kodad PCM (Int16 -> Float32).
  - [ ] Implementera `AudioContext`-buffert och tidsschemaläggning (24kHz Mono) för hackfritt ljud.
  - [ ] Bygg `initAudio()` för att hantera webbläsarens Autoplay-restriktioner vid knapptryck.
  - [ ] Verifiera ljudåtergivning med lokalt genererad mock-data.

- [ ] **Fas 2: Server-växel & E2E-Testmiljö (`server.ts`)**
  - [ ] Sätt upp Node.js WebSocket-server (port 8080) med klient-fanout (relay).
  - [ ] Implementera `INPUT_MODE`-hanterare (`INPUT_MODE=file` vs `INPUT_MODE=live`).
  - [ ] Bygg fil-streamer som läser en `.wav`-fil och skickar PCM-paket i realtid.
  - [ ] Skapa ett automatiserat E2E-skript (`npm run test:e2e`) med en headless testklient.
  - [ ] Lägg till funktion för valfri 24-timmars temporär sparande/radering av originalljud.

- [ ] **Fas 3: Gemini Live API-Integration**
  - [ ] Implementera tvåvägs strömning mot Gemini Live API (16kHz in -> 24kHz ut).
  - [ ] Bygg dynamisk BYOK-hantering för att skicka rätt API-nyckel till Gemini per språkkanal.
  - [ ] Hantera felmeddelanden, kvotgränser och återanslutningar mot AI-tjänsten.

- [ ] **Fas 4: Frontend UI & Dubbla Distributionsspår**
  - [ ] Skapa mottagarsidan (`Watch.tsx`) med språkval och anslutning mot `ws://`.
  - [ ] Skapa sändarsidan (`/host`) för ljudtekniker med `localStorage`-lagring av API-nyckel.
  - [ ] Konfigurera bygget för Netlify-publicering (Spår 2: Distanslyssnare över `wss://`).
  - [ ] Konfigurera lokal serving från Node-servern för kyrksalen (Spår 1: QR-kod over `ws://`).

- [ ] **Fas 5: SMS-styrning för Missionärer**
  - [ ] Bygg webbsida för 2FA-registrering av missionärers API-nycklar.
  - [ ] Skapa krypterad databaslagring för koppling mellan telefonnummer och API-nyckel.
  - [ ] Bygg SMS-parser för inkommande kommandon (`START EN`, `STOP`).
  - [ ] Integrera SMS-utlösaren så att den startar en Gemini-session på valfri språkkanal.

- [ ] **Fas 6: Slutgiltig E2E-Validering & Prestandatest**
  - [ ] Kör fullständigt E2E-test: Fil-inmatning -> Gemini -> Server-relay -> Klient-uppspelning.
  - [ ] Mät TTFA (Time to First Audio) och buffertstabilitet under belastning.
  - [ ] Verifiera att det lokala nätverket (Spår 1) fungerar helt offline utan internet.