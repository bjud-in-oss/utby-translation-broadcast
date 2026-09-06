# Steg 2e: Försoning och förlikning (TCK-022)

## 1. Målkonflikter och förlikningsbeslut
- **Målkonflikt 1 (Återanslutningsfördröjning vs Användaråterkoppling):** Under ett återanslutningsförsök kan användaren bli osäker på om sessionen lever.
  - *Förlikning:* Sätt statusen till `connecting` eller logga reconnect under pågående försök; endast efter 3 förbrukade försök ändras statusen till `error`.
- **Målkonflikt 2 (Miljövariabelkontroll utan hård blockering i dev):** I en lokal utvecklingsmiljö eller preview kan användaren vilja testa gränssnittet även utan aktiva nycklar.
  - *Förlikning:* Visa en diskret varningsbanderoll utan att inaktivera knappar, så att gränssnittet och mockade flöden fortfarande kan utvärderas.

MÄTTNAD: JA
