# Steg-för-steg: Så startar du ett nytt projekt (Enkel Guide)

Denna guide är skriven så att vem som helst, oavsett teknisk bakgrund, enkelt ska kunna sätta upp ett nytt projekt i Google AI Studio med full arkitekturkontroll.

---

## Steg 1: Skapa ett nytt projekt i Google AI Studio
1. Gå till [Google AI Studio Build](https://ai.studio/build).
2. Klicka på **"New App"** / **"Create App"**.

---

## Steg 2: Lägg in Systeminstruktionerna (SI v9.3)
1. Öppna filen `AI_STUDIO_SYSTEM_INSTRUCTIONS.md` i denna mapp.
2. Kopiera all text i rutan.
3. I AI Studio, klicka på **Settings** (kugghjulet) eller fältet **System Instructions**.
4. Klistra in texten där och spara.

*Vad gör detta?* Det lär AI:n att alltid planera noggrant, skriva tester först och följa arkitekturreglerna utan att slarva eller skapa spaghettikod.

---

## Steg 3: Ladda upp filerna från mallen
1. Packa upp filerna från `template-repo.tar.gz` (eller ladda upp mapparna direkt).
2. Se till att följande mappar finns i projektets filträd:
   - `doc/` (innehåller ADR, TICKETS, LAST_CYCLE och skills)
   - `scripts/` (innehåller `verify-architecture.js` och analysmotorer)
   - `src/` (innehåller `shared/`, `features/`, `App.tsx`)
   - `package.json` och `AGENTS.md`

---

## Steg 4: Skicka startprompten i chatten
1. Öppna filen `START_PROMPT.md`.
2. Kopiera texten och fyll i vad du vill bygga i klamrarna: `[BESKRIV DIN APPLIKATION HÄR]`.
3. Klistra in texten i AI Studios chatt och tryck på **Skicka**.

---

## Steg 5: Granska planen och godkänn (Fas 1 -> Fas 2)
1. **AI:n planerar (Fas 1)**: AI:n skapar nu filerna `1a_orientera.md` till `3c_...` och kör `npm run verify`.
2. **AI:n frågar dig**: AI:n presenterar sin plan i chatten och inväntar ditt klartecken.
3. **Du svarar**:
   - Om du gillar planen: Skriv bara *"Kör på!"* eller *"Genomför planen!"*.
   - Om du vill justera något: Skriv vad du vill ändra (t.ex. *"Byt färg till grön och lägg till ett sökfält"*).
4. **AI:n bygger (Fas 2)**: AI:n skapar godkännandefilen `APPROVAL.md`, skriver testerna, bygger källkoden och kontrollerar att allt fungerar.

---

## Vanliga frågor (FAQ)

### Hur vet jag att allt är godkänt och testat?
AI:n kör kommandot `npm run verify` automatiskt. Om något inte följer reglerna stoppas bygget automatiskt av den mekaniska spärren.

### Kan jag bygga appar med AI-funktioner?
Ja! Använd mallarna i `src/shared/templates/ai_zones/`. Där finns säkra zoner för anrop till t.ex. Google Gemini med garanterad JSON-struktur.
