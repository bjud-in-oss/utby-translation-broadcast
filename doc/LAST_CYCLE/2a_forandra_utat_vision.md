# Steg 2a: Förändra utåt (Vision för TCK-003)

- **Vision:** Ett komplett, kostnadsfritt och resilient webbläsarbaserat tolkflöde som kopplar samman Cloudflare Calls SFU med Gemini Live WebSocket.
- **Tekniska gränser:** Ingen bearbetning i Workern; all medielogik, jitterbuffert och resampling sker i klienten.
- **Robusthet:** 100 ms-paketering (10 Hz), backpressure-skydd vid 128 KB, och automatisk Hot Swap via GoAway.timeLeft och sessionResumptionUpdate.
