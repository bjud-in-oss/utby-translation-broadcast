# RUTINER FÖR SKILL- OCH TICKET-ADAPTERING (AGENTS.md v9.8)

1. Central ticket-logistik (doc/TICKETS.md)
* Registrera enbart aktiva ärenden (`Open`, `In Progress`) i `doc/TICKETS.md`. Rensa rader med status `Closed` vid cykelavslut i Steg 4.
* Knyt varje ticket till 1 domän under `src/features/` (eller `Global`).

2. Tregradig Agentdynamik (Följa, Vända om, Förlikas)
* Att följa (Steg 1a–1b): Formulera i Steg 1a tre fokuserade GROW-frågor ställda mot ändringens faktiska risknoder (`State`, `Contract`, `Effects`, `Resilience`). Besvara frågorna i `1b_kartlagga.md`, sätt `"active_vectors"` och driv kedjan $1b \rightarrow 2a \rightarrow 2b \rightarrow 2e \rightarrow 3c$ linjärt vid $V < 2$.
* Att vända om (Terminal & API): Exekvera `npm run verify` i terminalen för att köra parallella granskningar via Gemini API. Låt bakgrundsskriptet validera kontrakt, resiliens och gränssnitt oberoende av chattens kontext.
* Att förlikas (Steg 2e–3c & Token Gate): Avsluta Steg 2 i `2e_forsoning_och_forlikning.md` med nyckelordet `MÄTTNAD: JA` när alla målkonflikter lösts. Stanna vid Steg 3c och presentera koden från `REQUIRED_TOKEN.txt` i chatten.

3. TDD Exekvering i Fas 2 (Steg 4)
* Skapa `doc/LAST_CYCLE/APPROVAL.md` när användaren bekräftat koden i chatten.
* Skapa enhetstester med aktiva interaktionspåståenden i `src/` före källkodsändringar i Steg 4.
