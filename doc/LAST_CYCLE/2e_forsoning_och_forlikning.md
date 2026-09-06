# Steg 2e: Försoning och förlikning (TCK-020)

## 1. Målkonflikter och förlikningsbeslut
- **Målkonflikt 1 (Typografi och fallback-fonter):** Webbläsare som inte laddat Cormorant Garamond eller Space Mono kan få felaktig layout.
  - *Förlikning:* CSS konfigurerar robusta fallbacks (`Georgia, serif` och `ui-monospace, monospace`) så att layouten alltid är stabil och läsbar.
- **Målkonflikt 2 (Panik-tystning vs minimalistisk renhet):** Design Variation 3 hade ingen explicit panikknapp i mockupen.
  - *Förlikning:* Panik-tystningsknappen placeras stilrent bredvid huvudknappen vid aktiv session i matchande Space Mono-stil så att säkerhetskraven från TCK-019 bibehålls utan att störa designens lugn.

MÄTTNAD: JA
