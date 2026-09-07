# Steg 1a: Orientera (TCK-005)

## Mål
Genomföra fas 7-skuldssanering och LiveKit-städning i domänen `live_translation`:
1. Ta bort alla kontrollsteg för `LIVEKIT_URL` och `LIVEKIT_API_KEY` från `useLiveTranslation.ts`.
2. Ta bort `LiveKitTokenRequestSchema` och LiveKit-specifika fält från `domain/schema.ts`.
3. Ta bort `LiveKitTokenRequest` och LiveKit-fält från `domain/types.ts`.
4. Rensa bort re-exporter av LiveKit i `index.ts`.
5. Deprekera/rensa tur-baserade prediktionsfunktioner (`calculateRegressionModel`, `predictTurnDuration`) i `domain/adaptiveLogic.ts` till förmån för direkt buffert- och jitterstyrning (`AudioProcessor.worklet.ts`).
6. Uppdatera UI och texter i `src/App.tsx` till Cloudflare SFU / Lokal WS.
7. Rensa `LIVEKIT`-beroenden från enhetstester.

## GROW-frågor mot ändringens risknoder
1. **Contract & State (Gränssnitt och schema):** Hur säkerställer vi att borttagningen av `LiveKitTokenRequestSchema` och fälten i `TranslationSessionConfigSchema` inte bryter mot andra konsumenter eller Zod-körtidsvalideringar i `domain/schema.ts`?
2. **Effects & Pacing (Adaptiv styrning och regression):** Hur fasar vi ut de tur-baserade prediktionsfunktionerna i `adaptiveLogic.ts` utan att påverka `AudioProcessor.worklet.ts` och dess 300 ms ringbuffert och adaptiva slew (+/- 1–3 %)?
3. **Resilience (Miljö och varningar):** Hur garanterar vi att miljövariabelkontrollen i `useLiveTranslation.ts` endast rapporterar relevanta avvikelser (`GEMINI_API_KEY`) utan onödigt brus från historiska LiveKit-nycklar?
