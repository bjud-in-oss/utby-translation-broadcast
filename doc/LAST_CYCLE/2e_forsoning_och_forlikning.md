# Steg 2e: Försoning och förlikning (TCK-017)

## 1. Målkonflikter och förlikningsbeslut

### Konflikt 1: Låg latens mot ljudstabilitet och frihet från klick
* **Försoning:** Gemini Live API levererar asynkrona PCM-klumpar i varierande storlek (200-500ms). För att eliminera metallisk robotröst och WebRTC buffer overflow införs en strikt jitter ring-buffert med metronomloop som plockar exakt 480 samplar (20ms vid 24kHz) per intervall. 40ms initial jitterbuffert ger perfekt stabilitet med bibehållen simultankapacitet.

### Konflikt 2: Gemini 15-minuters sessionstimeout mot oavbruten live-sändning
* **Försoning:** "Zero-Downtime AudioSource Preservation" behåller LiveKit-rummet och `AudioSource` helt intakt. Vid minut 14:00 pre-warmas en ny WebSocket parallellt med sparad `resumptionHandle`. När `setupComplete` mottagits görs en atomär referensväxling. Åhörare märker inte övergången.

### Konflikt 3: Säkerhet mot enkel klientarkitektur
* **Försoning:** LiveKit-hemligheter och Gemini API-nycklar stannar på servern/i säkra zoner. Tokens genereras asynkront med klock-skew (`nbf: -5s`) och korta sessioner (15 min).

### Konflikt 4: API-känslighet (Felkoder 1008/1011)
* **Försoning:** Payload Isolation garanterar att varken `tools`, `systemInstruction` eller textmeddelanden någonsin skickas tillsammans med `translationConfig`. Endast ren PCM-audio strömmas.

MÄTTNAD: JA
