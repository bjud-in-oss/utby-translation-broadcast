# 3-Zonsmallen för Säker AI-integration (AI Zones Pattern)

Denna arkitekturmodell säkerställer att generativ AI (t.ex. Gemini) integreras säkert, robust och utan risk för prompt-injektioner, UI-läckage eller korrupt applikationstillstånd.

---

## De Tre Zonerna

```text
┌─────────────────────────┐
│   ZON 1: Sanitizer      │  Tvättar användarindata, tar bort skadlig kod,
│   (Sidoeffektsfri)      │  begränsar längd och förbereder strukturer.
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   ZON 2: Reasoner       │  Isolerad kommunikation med AI-modellen.
│   (LLM-anrop / Proxy)   │  Använder strikta JSON-scheman och systemprompter.
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   ZON 3: Executor       │  Validerar AI-svaret mot datatyper/scheman
│   (Tillstånd & Svar)    │  innan det tillåts uppdatera användargränssnittet.
└─────────────────────────┘
```

---

## Filstruktur & Användning

1. **`sanitizer.ts` (Zon 1)**:
   - *Syfte*: Rena text, parametrar och metadata.
   - *Regel*: Får **inte** innehålla API-nycklar, `fetch`, eller ändra globalt tillstånd.

2. **`reasoner.ts` (Zon 2)**:
   - *Syfte*: Skicka anrop till backend-proxyn (`/api/*`) eller Gemini SDK på serversidan.
   - *Regel*: Tar endast emot förbehandlad data från Zon 1. Exponerar aldrig API-nycklar i webbläsaren.

3. **`executor.ts` (Zon 3)**:
   - *Syfte*: Typkontrollera och parsa svaret. Om modellen hallucinerar eller svarar i fel format faller exekveringen tillbaka på ett säkert fallback-värde.
   - *Regel*: Det är endast Zon 3 som får returnera färdigbehandlad data till React-hooks och UI-komponenter.

4. **`geminiServerZone.ts`**:
   - Serverbaserad mall för Node/Express som använder `@google/genai` med miljövariabeln `GEMINI_API_KEY`.
