---
name: livekit-server-tokens
description: Instruktioner för säker generering av LiveKit Access Tokens i Node.js/Next.js backend med v2 SDK (await at.toJwt()), clock skew-buffert (nbf: -5s) och korrekta VideoGrants.
---

# LiveKit Server Tokens Guidelines

## 1. KRAV: LiveKit Server SDK v2 Syntax
Använd `livekit-server-sdk` v2[cite: 17]. 
* **MANDAT:** Anropet `at.toJwt()` returnerar ett Promise och MÅSTE föregås av `await`[cite: 13, 17]:
```typescript
const token = await at.toJwt(); // Obligatoriskt i v2
```

## 2. KRAV: Clock Skew & TTL (Klock-snedvridning)
För att förhindra `401 Unauthorized / Token not valid yet` när serverns klocka skiljer sig från klienten[cite: 23, 24]:
* **MANDAT:** Sätt `nbf` (not before) 5 sekunder i dåtid vid manuell token-konstruktion[cite: 24].
* **MANDAT:** Sätt en kort TTL (Time-To-Live) på maximalt 15–30 minuter (`ttl: "15m"`) för att förhindra att läckta tokens förblir giltiga[cite: 19, 24].

## 3. KRAV: VideoGrants & Säkerhet
Exponera ALDRIG `LIVEKIT_API_SECRET` i klientkod eller `NEXT_PUBLIC_`-variabler[cite: 17, 19, 20]. Generera alltid tokens i backend API-routes (t.ex. Next.js App Router)[cite: 19, 20].

Exakta rättigheter i `VideoGrant`[cite: 13, 25]:
* **Broadcaster (Talare):** `{ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true }`[cite: 19, 22, 25].
* **Listener (Åhörare):** `{ roomJoin: true, room: roomName, canPublish: false, canSubscribe: true }`[cite: 17, 25].
* **Translation Bot / Local Streamer:** `{ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, hidden: true }`[cite: 13, 25].

## 4. PROGRESSIV KODREFERENS
Se källkodsfilen `assets/pattern-server-tokens.ts` för Next.js App Router API Route-implementation[cite: 20].
