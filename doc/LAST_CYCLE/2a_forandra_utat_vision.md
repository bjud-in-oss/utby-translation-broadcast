# Steg 2a: Förändra utåt - Vision (TCK-007)

## Målbild
Skapa en robust TCP-baserad ljudtransportadapter (`LocalWebSocketAdapter`) för lokal distribution i begränsade nätverk (som kyrkor eller skolor) där UDP-portar blockeras av brandväggar.
Adaptern implementerar `AudioTransportAdapter` och tillhandahåller adaptiv WSOLA-jitterbuffring (300 ms mål) samt Zero-GC binär överföring med backpressure-skydd. Hooken `useLocalWebSocket` ger ett reaktivt gränssnitt med iOS Safari-resiliens.
