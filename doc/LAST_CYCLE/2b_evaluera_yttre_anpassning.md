# Steg 2b: Evaluera yttre anpassning (TCK-004)

## 1. Yttre beroenden och integration
- **Cloudflare Calls API vs Klientberäkning:** Eftersom Cloudflare Calls debiterar per aktiv spårminut för varje deltagare/lyssnare, speglar formeln `(1 + Tolkspår) * Lyssnare * (1 / 60)` den exakta minutåtgången.
- **Lokal redundans:** Förbrukningen persisteras säkert i klientens webbläsare så att sessioner och omladdningar behåller ackumulerat värde under månaden.
- **Användargränssnitt:** Mätaren visas diskret och professionellt i arrangörens kontrollpanel utan att störa den redaktionella estetiken i `LiveTranslationWidget`.
