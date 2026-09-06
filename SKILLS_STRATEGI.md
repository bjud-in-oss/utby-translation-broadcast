# Färdighetsstrategi: Varför vi skickar med Matt Pococks Skills direkt i repot

## Frågeställning: Klona vid körtid vs. Skicka med direkt i repot?

### Slutsats: Det är BETYDLIGT SÄKRARE att skicka med dem i repot (`doc/skills/mattpocock/`).

Här är de fyra huvudsakliga arkitektoniska skälen till detta beslut:

---

### 1. Hermetisk reproducerbarhet och offline-stabilitet
- **Risk vid extern kloning**: Om ett externt GitHub-repo flyttas, tas bort, byter branch-namn (t.ex. `main` till `master`) eller ändrar filstrukturen vid en uppdatering slutar din bygg- och planeringsmiljö att fungera.
- **Fördel med att skicka med**: Projektet är helt självförsörjande (hermetiskt). Oavsett när du öppnar projektet eller vilken maskin/miljö du kör i finns alla instruktioner fysiskt tillgängliga på disken.

### 2. Sandbox- & Container-begränsningar i AI-miljöer
- Google AI Studio, Cloud Run-containrar och isolerade CI/CD-pipelines körs ofta med strikta sandlåderegler där fri access till externa nätverk eller git-submoduler kan vara strypt eller kräva autentisering.
- Genom att filerna ligger direkt i repot kan AI-agenten omedelbart läsa in färdigheter via `view_file` och JIT utan att behöva köra externa nätverkskommandon.

### 3. Versionssäkerhet & Kompatibilitet med SI v9.3
- Systeminstruktionen (SI v9.3) och kvalitetsvakten (`verify-architecture.js`) förväntar sig exakta filvägar som t.ex. `doc/skills/mattpocock/skills/engineering/wayfinder/SKILL.md`.
- Genom att ha dem samlade i repot kan vi garantera att alla relativa länkar och JSON-deklarationer fungerar utan avbrott.

---

## Hur uppdaterar man färdigheterna i framtiden?
Om du i framtiden vill synka in nya eller uppdaterade färdigheter från Matt Pococks officiella arkiv kan du enkelt köra:

```bash
# Från projektets rot:
git clone --depth 1 https://github.com/mattpocock/skills.git temp-skills
rm -rf doc/skills/mattpocock/skills
cp -r temp-skills/skills doc/skills/mattpocock/
rm -rf temp-skills
```
Detta ger dig det bästa av två världar: 100 % säkerhet och driftsstabilitet i vardagen, med möjlighet till kontrollerade manuella uppdateringar vid behov.
