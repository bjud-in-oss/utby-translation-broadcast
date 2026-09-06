name: cloudflare-calls-sfu
description: Hanterar WebRTC-anslutning, SDP-signalering och ljudspår via Cloudflare Calls utan local port-forwarding.
instructions: |
  - Cloudflare Worker (cloudflare-worker/src/index.ts) hanterar enbart REST API och SDP offer/answer-utbyte för Cloudflare Calls.
  - Ingen mediebroms, ljudavläsning eller WebSocket-strömning får köras i Workern p.g.a. Cloudflare V8-isolatets CPU-begränsningar[cite: 16].
  - Klientkoden (useCloudflareSFU.ts) måste hantera iOS Safari-ljudlås genom att köra en synkron `bufferSource.start()` med en tyst 0,1s ljudbuffert direkt i användarens klick-handler[cite: 16].
  - Klienter ska kunna prenumerera på namngivna ljudspår ('audio-es', 'audio-sw') baserat på valt språk[cite: 16].