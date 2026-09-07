# Startprompt för ett Nytt Projekt (Google AI Studio)

När du startar ett helt nytt projekt i Google AI Studio eller annan AI-miljö, klistra in texten nedan i ditt allra första chattmeddelande:

---

```text
Hej! Vi startar nu ett nytt projekt baserat på vår arkitekturmall (SI v9.3).

Mitt mål med denna applikation är:
[BESKRIV DIN APPIKATION OCH VAD ANVÄNDAREN SKA KUNNA GÖRA HÄR, T.EX: "Ett verktyg för att schemalägga och bjuda in deltagare till lokala träffar med karta och SMS-aviseringar."]

Instruktioner för denna första tur (Fas 1 - Planering):
1. Uppdatera metadata.json med ett passande namn och beskrivning för appen.
2. Skapa ett nytt ärende i doc/TICKETS.md med status "In Progress" och knyt det till en domän under src/features/.
3. Genomför den obrutna planeringssekvensen genom att skapa filerna i doc/LAST_CYCLE/ från 1a_orientera.md till 3c_fil_operativ_kallkodsspecifikation.md (avslutas med "BESLUT: GODKÄND").
4. Kör `npm run verify` i terminalen för att mekaniskt bekräfta att planen och arkitekturreglerna är intakta.
5. Presentera din plan och arkitekturöversikt på varm, pedagogisk svenska och invänta mitt godkännande innan du skriver produktionskod (Steg 4).
```
