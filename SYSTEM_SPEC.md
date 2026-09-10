# 🛠️ SYSTEM_SPEC: Realtidsöversättning för Kyrka

## 1. Systemregler & BYOK
* **BYOK (Bring Your Own Key):** Varje sändarkanal drivs av sändarens personliga Gemini Live API-nyckel.
* **Envägstolkning:** Max 1 aktiv AI-session per språk. Tolkat ljud fannas ut (relay) till alla lyssnare på kanalen.
* **Säkerhetsgräns:** Web-sändare sparar API-nyckel i `localStorage`. SMS-sändare sparar krypterad nyckel i serverns databas kopplad till godkänt telefonnummer (2FA via webb-handskakning).

## 2. Nätverk & Routing (Modell 2)
* **Lokal väg (Salen / QR-kod):** 
  * URL: `http://<server-ip>:3000` eller `http://kyrka.local:3000`
  * Protokoll: Unencrypted WebSocket (`ws://`) över lokal TCP.
  * Syfte: Rundar UDP-spärrar i kyrkans Wi-Fi, förbrukar 0 Mbps internetbandbredd.
* **Distansväg (Hemma / Webblänk):**
  * URL: `https://kyrka.netlify.app`
  * Protokoll: Secure WebSocket (`wss://`) via Cloudflare Tunnel eller Moln-Relay.

## 3. Ljudspecifikation & Datakontrakt
* **Ingående ljud (Svenska till Gemini):** 16 000 Hz, 1-kanal (Mono), 16-bit PCM (`Int16Array`).
* **Utgående ljud (Från Gemini till Klient):** 24 000 Hz, 1-kanal (Mono), 16-bit PCM (`Int16Array`).
* **WebSocket JSON-kontrakt (Server -> Klient):**
  ```json
  {
    "type": "audio",
    "language": "en",
    "data": "<Base64-kodad PCM-data>",
    "sampleRate": 24000
  }