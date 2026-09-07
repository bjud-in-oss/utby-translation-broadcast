# Steg 1a: Orientera (TCK-006)

## Mål
Etablera det abstrakta transportkontraktet `AudioTransportAdapter` och implementera `CloudflareSFUAdapter` för WebRTC/Cloudflare Calls SFU, samt refaktorisera `useCloudflareSFU` till att delegera till adaptern.

## GROW-frågor mot ändringens faktiska risknoder
1. **Contract (Transport-abstraktion):** Hur utformas gränssnittet `AudioTransportAdapter` i `src/features/live_translation/domain/types.ts` så att det enhetligt abstraherar både WebRTC/SFU och framtida WebSocket/WSOLA-transporter utan att läcka transportinterna protokoll i domänlagret?
2. **State & Effects (Livscykel och tillståndsövergångar):** Hur hanterar `CloudflareSFUAdapter` tillstånden (`disconnected`, `connecting`, `connected`, `error`) och hanteringen av `onStatusChange`-callbacks så att asynkron SDP-förhandling och ICE-gathering inte lämnar hängande transceivers vid fel?
3. **Resilience (Browser-resiliens och Safari-lås):** Hur säkerställs att iOS Safari audio-upplåsning och avregistrering vid unmount orkestreras sömlöst mellan `CloudflareSFUAdapter` och React-hooken `useCloudflareSFU` utan att göra adaptern beroende av globala DOM-objekt vid enhetstestning?
