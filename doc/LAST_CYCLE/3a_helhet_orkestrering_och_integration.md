# Steg 3a: Helhet, orkestrering och integration (TCK-020)

## 1. Integrationsarkitektur
- `LiveTranslationWidget` representerar "Control"-ytan i Variation 3-arkitekturen.
- Tar emot `useLiveTranslation`-hookens data och renderar den i det redaktionella gränssnittet.
- Integrerar sömlöst med framtida layoutcontainer i `App.tsx`.
