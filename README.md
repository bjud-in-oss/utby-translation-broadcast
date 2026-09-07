# Samordningsmotorn (v9.7)

Hej,

Denna samordningsmotor stakar ut AI Studios förmåga att bygga mer långsiktiga appar och flyttar utvecklarens fokus från byggandet av appen till appens användning.

Motorns innersta drivkrafter är att följa, att vända om och att förlikas, vilka tillsammans gör agentens natur och resiliens starkare. Den är just nu anpassad till Typescript men passar även till andra kodningsverktyg och programspråk. 

Tänk om jag kunde vara lika följsam och villig som denna agent att följa, vända om till och förlikas med Gud. Jag håller ofta envist och tröttsamt fast vid min egna väg. Det är tacksamt att Gud inte någonsin kommer ta bort min agens och genom att agera i tro på Jesus, blir den som även drivs av ett förkrossat och botfärdigt hjärta och försoning en ny agent i honom och genom honom.

För mig bygger jag denna motor för att kunna bygga långsiktiga och kostnadsfria appar inom följande områden:

 - Vara en vän: Socialt umgänge och gemenskap
 - Få näring av Guds ord: Andligt stöd och undervisning
 - Hjälpa andra: Praktiskt tjänande och insatser 

Lycka till även du med ditt kreativa skapande.
/Mattias Renman

---

## 📚 Snabbguider & Kom-igång

- 🌟 **[Steg-för-steg: Så startar du ett nytt projekt (Enkel Guide)](GUIDE_KOM_IGANG.md)** – *Börja här! Enkel 1-2-3 guide.*
- 📖 **[Fullständig Arkitektur- & Metodbeskrivning (SI v9.7)](doc/ARKITEKTUR_BESKRIVNING.md)** – *Djupgående förklaring av FSD, processkedjan och mekaniska spärrar.*
- ⚙️ **[Systeminstruktion för Google AI Studio (SI v9.7)](AI_STUDIO_SYSTEM_INSTRUCTIONS.md)** – *Texten att klistra in i System Instructions.*
- 🚀 **[Startprompt för Nytt Projekt](START_PROMPT.md)** – *Den perfekta prompten för att starta första chatten.*
- 🧠 **[3-Zonsmallen för Säker AI-integration](src/shared/templates/ai_zones/README.md)** – *Mönster för Gemini & LLM (Sanitizer, Reasoner, Executor).*
- 🛡️ **[Färdighetsstrategi & Matt Pocock Skills](SKILLS_STRATEGI.md)** – *Varför färdigheterna ligger lokalt och hur de uppdateras.*
- 🙏 **[Tack & Erkännanden](doc/ACKNOWLEDGEMENTS.md)** – *Inspirationskällor och utvecklare som bidragit till principerna.*

---

## Projektets Huvuddelar i v9.7

1. **Feature-Sliced Design (FSD)**: Ren domänarkitektur under `src/features/[domän]/`.
2. **Mekaniska kvalitetsspärrar (`scripts/verify-architecture.js`)**: Körs via `npm run verify` i terminalen för att validera sekvenser, TypeScript-kompilation, 120-raders UI-gränser och bakgrunds-API-kontroller.
3. **Fysiskt processminne (`doc/LAST_CYCLE/`)**: Driver linjär planering (1a -> 3c) vid enkla uppgifter och dynamisk förgrening vid komplexa tvärsnittsändringar.
4. **Mänsklig Token Gate**: Genererar en godkännandekod i `doc/LAST_CYCLE/REQUIRED_TOKEN.txt` som måste bekräftas i chatten innan källkod ändras.
5. **JIT Skill Library (`AGENTS.md` / `doc/skills/mattpocock/`)**: Samling av analys- och kodningsfärdigheter (`wayfinder`, `to-spec`, `tdd`, `implement`).

---

## Snabbstart i terminalen (för utvecklare)

```bash
# 1. Installera beroenden
npm install

# 2. Driva Fas 1 i AI Studio
# Kör planeringskedjan 1a -> 3c i chatten

# 3. Kör arkitekturkontroll och generera Token Gate
npm run verify

# 4. Godkänn i chatten och exekvera TDD (Fas 2 / Steg 4)
# Klistra in koden från REQUIRED_TOKEN.txt i chatten
