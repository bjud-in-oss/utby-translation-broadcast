# Steg 1a: Orientera (TCK-020: Tillämpa Design Variation 3 på LiveTranslationWidget)

## 1. Problembeskrivning & Målbild
Anpassa `LiveTranslationWidget` under `src/features/live_translation/` till den godkända designvariationen "Variation 3":
- Redaktionell minimalistisk estetik med vit bakgrund, subtil djup skuggning och ramar.
- Typografi inspirerad av Cormorant Garamond och Space Mono för status och fält.
- Understrukna minimalistiska valrutor för enhetsval och målspråk.
- Minimalistisk ljudvolymsmätare (4px hårfin indikator) och monospacad procentsats.
- Distinkt primärknapp ("Starta tolkning" / "Avsluta tolkning") i djupt bläck (`#1a1a1a`) med accenthover (`#5e6ef2`).
- Bakgrundsvattenmärke ("G") i Cormorant Garamond.

## 2. Inblandade domäner
- `src/features/live_translation/`

## 3. Valda färdigheter & Referenser
- `livekit-client-audio` & Design Variation 3 specifikation

---

## 4. Fokuserade GROW-frågor mot Risknoder

### GROW Fråga 1: Contract & State (Designkompatibilitet och IDs)
* **Goal:** Applicera Variation 3-stilen utan att bryta existerande element-ID:n och testkontrakt (`translation-title`, `status-badge`, `audio-device-select`, `target-lang-select`, `audio-level-meter`, `toggle-translation-btn`, `panic-mute-btn`).
* **Reality:** Komponenttester och integrationsanrop förlitar sig på dessa ID:n och aria-labels.
* **Options:** Byta ut komponentstrukturen helt kontra att applicera stilklasser direkt på de etablerade elementen med full tillgänglighet.
* **Way forward:** Behåll samtliga ID:n och aria-attribut intakta och applicera Tailwind-utilityklasser och inline CSS-variabler motsvarande specifikationen.

### GROW Fråga 2: Resilience & Line Limits (120-radersgräns och max 3 hooks)
* **Goal:** Hålla `LiveTranslationWidget.tsx` under 120 rader och högst 3 hooks enligt kodbasens regler.
* **Reality:** Utökad designkod kan lätt svälla i radantal.
* **Options:** Inlinea långa stylingklasser och dela upp i subkomponenter kontra att använda rena och effektiva Tailwind-klasser.
* **Way forward:** Använd koncisa klasser och utnyttja `languages.ts` för data, så att komponenten hålls på ca 100 rader.

### GROW Fråga 3: Effects & Interactions (Panik-tystning och Statusvisning)
* **Goal:** Säkerställa att statusindikatorn ("idle", "active", "connecting") och paniktystningsknappen harmoniserar med den redaktionella designen.
* **Reality:** Variation 3 har en stilren monospace statusindikator i accentfärg (`#5e6ef2`).
* **Options:** Dölja paniktystning kontra att integrera den som en sekundär minimalistisk knapp.
* **Way forward:** Visa paniktystningsknappen i matchande monospacestil intill huvudknappen när sessionen är aktiv.

---

```json
{
  "status": "IN_PROGRESS",
  "current_domain": "live_translation",
  "next_step": "1b_kartlagga",
  "ticket_id": "TCK-020",
  "active_skill": "livekit-client-audio"
}
```
