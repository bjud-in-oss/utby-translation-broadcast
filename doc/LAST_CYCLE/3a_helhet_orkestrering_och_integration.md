# Steg 3a: Helhet, orkestrering och integration (TCK-005)

Huvudflödet körs via `LiveTranslationWidget` -> `useLiveTranslation` -> `TranslationBridge` och `useCloudflareSFU`.
Miljövariabelkontroll validerar endast `GEMINI_API_KEY`.
Texter i `App.tsx` refererar till Cloudflare SFU / Lokal WS.
