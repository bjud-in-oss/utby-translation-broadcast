# Steg 2e: Försoning och förlikning (TCK-003)

## 1. Målkonflikter och förlikningsbeslut
- **Målkonflikt 1 (Jitter vs Latens):** En stor ringbuffert förhindrar jitter men ökar tidsfördröjningen i tolkningen.
  - *Förlikning:* Använd dynamisk slew (+/- 3–5 %) för att hålla bufferten kring 300 ms utan att introducera hörbara tonhöjdsartefakter.
- **Målkonflikt 2 (Paketeringsstorlek vs Nätverksoverhead):** 20 ms ramar ger låg latens men 50 Hz meddelandefrekvens belastar WebSocket och klient.
  - *Förlikning:* Paketera i 100 ms (10 Hz) vilket ger optimal balans mellan overhead och latens.

MÄTTNAD: JA
