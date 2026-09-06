# Steg 4: Producera (TCK-022: iOS WebAudio unlock, WebSocket retry backoff och credential-varning)

## 1. Genomförda källkodsändringar
- `src/features/live_translation/domain/translationBridge.ts`: Implementerat automatisk återanslutning vid oväntat anslutningstapp (t.ex. vid konferens-Wi-Fi dippar) med exponential backoff (1s, 2s, 4s upp till 3 försök) innan fel emitteras.
- `src/features/live_translation/domain/__tests__/translationBridge.test.ts`: Skapat TDD-enhetstester som simulerar oväntat nätverksbortfall och verifierar återanslutningscykeln samt att avsiktlig frånkoppling respekteras.
- `src/features/live_translation/hooks/useLiveTranslation.ts`:
  - Lagt till `unlockAudioContext()` som synkront resume:ar `AudioContext` vid användargest (klick), vilket låser upp ljuduppspelning på iOS Safari innan asynkrona anrop görs.
  - Lagt till proaktiv kontroll av `LIVEKIT_URL`, `LIVEKIT_API_KEY` och `GEMINI_API_KEY` vid komponentmontering.
- `src/features/live_translation/components/LiveTranslationWidget.tsx`:
  - Anropar synkront `unlockAudioContext()` direkt i klickhanteraren före start.
  - Renderar ett diskret, monospacat varningsfält om miljövariabler saknas i `.env.local`.
  - Håller komponenten strikt under 120 rader (100 rader) med endast 1 hook.
- `src/features/live_translation/components/__tests__/LiveTranslationWidget.test.tsx`: Uppdaterat UI-testerna för att testa varningen och den uppdaterade klickhanteraren.
- `src/features/live_translation/doc/BUSINESS_RULES.md` & `INTEGRATIONS.md`: Uppdaterat dokumentationen med reglerna för återanslutning och behörighetsvarning.

## 2. Testning
Samtliga enhetstester körda med Vitest utan fel.
