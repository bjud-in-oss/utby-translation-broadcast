# Fullständig Arkitektur- & Metodbeskrivning (SI v9.3)

Denna dokumentation ger en fullständig och djupgående förklaring av **Samordningsmotorns** mekaniska principer, arkitektur och hur kvalitetsgarantin upprätthålls vid utveckling med autonoma AI-agenter.

---

## 1. Filosofi & Grundprinciper

Samordningsmotorn bygger på tre grundläggande principer:
1. **Att Följa**: Agenten följer strikta fysiska spår i form av filsekvenser på disken snarare än att improvisera i konversationsminnet.
2. **Att Vända Om**: När ett mekaniskt test (`npm run verify`) fallerar eller koden bryter mot reglerna, tvingas agenten göra en friktionsfri cykelretur tillbaka till planeringsstadiet.
3. **Att Förlikas**: Människan (arkitekten) har alltid sista ordet via en fysisk gate (`APPROVAL.md`) innan källkod får ändras.

---

## 2. Arkitekturstruktur (Feature-Sliced Design)

Källkoden är strukturerad enligt principen om Feature-Sliced Design (FSD):

```text
src/
├── features/               # Självständiga domäner/funktioner
│   └── [domännamn]/
│       ├── components/     # UI-komponenter (max 120 rader per fil)
│       │   └── __tests__/  # Interaktiva enhetstester (TDD)
│       ├── domain/         # Affärslogik, typer och isolerade AI-zoner
│       ├── hooks/          # React-hooks för tillståndshantering
│       └── index.ts        # Offentlig fasad (public export)
├── shared/                 # Delade återanvändbara moduler
│   └── templates/ai_zones/ # Säkerhetsmallar för AI-anrop (Sanitizer, Reasoner, Executor)
└── App.tsx                 # Rotvy som komponerar ihop domänerna
```

---

## 3. Processkedjan (doc/LAST_CYCLE/)

Varje förändring drivs igenom en fysisk planerings- och exekveringskedja:

### Fas 1: Planering (Obrutet svep)
- **1a_orientera.md**: Analyserar nuläget, sätter ärendestatus i `doc/TICKETS.md` och deklarerar nästa steg i ett JSON-block.
- **1b_kartlagga.md**: Kartlägger beroenden och påverkade domäner.
- **2a_forandra_utat_vision.md till 2f_evaluera_syntes.md**: Arkitektonisk utvärdering, refaktorisering (2c) och syntes.
- **3a_helhet_orkestrering.md**: Integration mellan domäner.
- **3b_doman_kontrakt.md**: Datamodeller och typdefinitioner.
- **3c_fil_operativ_kallkodsspecifikation.md**: Exakt lista över filer som kommer att skapas eller ändras (avslutas med `BESLUT: GODKÄND`).

### Mänsklig Gate
- Användaren granskar planen i chatten. När användaren ger klartecken skapas `doc/LAST_CYCLE/APPROVAL.md` med innehållet `OK`.

### Fas 2: Verkställande (Steg 4)
- **TDD Först**: Enhetstester med aktiva interaktioner (`fireEvent`/`expect`) skrivs först.
- **Källkod**: Produktionskoden implementeras.
- **Mekanisk Verifiering**: `npm run verify` körs för att validera radantal, AI-isolering, fasader och hash-integritet.

---

## 4. Säker AI-Isolering (3-Zonsmallen)

Alla anrop till LLM-modeller (t.ex. Gemini) måste passera tre strikta zoner för att förhindra prompt-injektioner och trasigt applikationstillstånd:
1. **Zon 1 (Sanitizer)**: Tvättar indata och begränsar stränglängder utan sidoeffekter.
2. **Zon 2 (Reasoner)**: Utför AI-anropet mot server/proxy med strikta JSON-scheman.
3. **Zon 3 (Executor)**: Validerar och mappar AI-svaret till appens interna typer innan UI uppdateras.
