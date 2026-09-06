# Steg 4: Producera (TCK-019: Enhetsval, parallell tolkning & utökat språkbibliotek)

## 1. Genomförda källkodsändringar
- `src/features/live_translation/domain/languages.ts`: Implementerat heltäckande språkbibliotek med 33 språk indelade i 6 geografiska regioner (inklusive Swahili `sw`, Somaliska `so`, Amhariska `am`, Nordiska, Västeuropeiska, Östeuropeiska, Mellanöstern och Asiatiska språk).
- `src/features/live_translation/domain/types.ts`: Utökat `SupportedLanguage` samt lagt till kontrakt för `AudioInputDevice`.
- `src/features/live_translation/domain/schema.ts`: Uppdaterat `SupportedLanguageSchema` mot fullständiga språkkoder via Zod.
- `src/features/live_translation/domain/multiBridgeOrchestrator.ts`: Skapat orkestreringsmodul för parallella `TranslationBridge`-instanser under isolerade identiteter (`translator-[språkkod]`).
- `src/features/live_translation/hooks/useLiveTranslation.ts`: Lagt till `enumerateDevices()`-hantering, val av inmatningskälla med `deviceId` (NDI Webcam Input / mikrofon), samt selektiv kanaluppspelning och muting i lyssnarvyn.
- `src/features/live_translation/components/LiveTranslationWidget.tsx`: Byggt gränssnitt med ljudingångsdropdown, regionkategoriserad språkvalsmeny, ljudmätare och panik-tystning (< 120 rader).
- `src/features/live_translation/components/__tests__/LiveTranslationWidget.test.tsx`: Skrivit TDD-tester för enhetsval (NDI), målspråksval (inkl. Swahili) och snabbtystning.
- `src/features/live_translation/index.ts`: Exponerat de nya domänmodulerna och typerna genom fasaden.
- Uppdaterat lokal dokumentation i `doc/` (`BUSINESS_RULES.md`, `INTEGRATIONS.md`, `INDEX.md`, `UI_WORKFLOWS.md`).

## 2. Testning
Tester exekverade med Vitest utan anmärkningar.
