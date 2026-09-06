# Steg 1a: Orientera (TCK-018: Global / App.tsx)

## 1. Problembeskrivning & Målbild
Uppdatera applikationens rotkomponent `src/App.tsx` så att den ersätter mallens demoräknare (`ExampleWidget`) med den färdigbyggda tolkmodulen `<LiveTranslationWidget />` från `src/features/live_translation`. Rotvyn ska ramas in med ren layout, ändamålsenlig rubrik och god visuell hierarki.

## 2. Inblandade domäner
- `Global` (`src/App.tsx`, `src/__tests__/App.test.tsx`)

## 3. Valda färdigheter & Referenser
- `gemini-livekit-translation-bridge` & Feature-Sliced Design fasadregler.

---

## 4. Fokuserade GROW-frågor mot Risknoder

### GROW Fråga 1: State & UI Architecture
* **Goal:** Presentera tolkmodulen som primär vy i applikationen utan att läcka domänlogik till toppkomponenten.
* **Reality:** `App.tsx` innehöll tidigare `ExampleWidget`. `LiveTranslationWidget` hanterar redan sitt eget interna tillstånd via sin egen hook.
* **Options:** Lägga layout och kontroller i `App.tsx` (onödig komplexitet) kontra att hålla `App.tsx` som en ren layoutram som bäddar in `<LiveTranslationWidget />`.
* **Way forward:** Hålla `App.tsx` extremt ren (< 50 rader) och låta `LiveTranslationWidget` agera självständig huvudenhet.

### GROW Fråga 2: Contract & Imports
* **Goal:** Säkerställa typ- och importintegritet utan beroendecykler eller fasadöverträdelser.
* **Reality:** `src/features/live_translation/index.ts` tillhandahåller en ren namngiven fasadexport för `LiveTranslationWidget`.
* **Options:** Direktimport från djupa komponentmappar (FSD-överträdelse) kontra fasadimport via `./features/live_translation`.
* **Way forward:** Importera enbart `{ LiveTranslationWidget }` från `./features/live_translation`.

### GROW Fråga 3: Effects & Resilience
* **Goal:** Skapa en responsiv, centrerad canvas med god tillgänglighet (WCAG AA), subtil färgpalett och noll externa bieffekter vid sidladdning.
* **Reality:** Webbvyn körs i iframe och mobilvyer; behöver centrerad layout med `max-w-2xl` och balanserad marginal.
* **Options:** Hårdkodade absoluta positioner kontra flex-centrerad container med adaptiv padding.
* **Way forward:** Använda en responsiv flex-kolumn med subtil bakgrund (`bg-stone-100`), distinkt rubrik och säker containerram.

---

```json
{
  "status": "IN_PROGRESS",
  "current_domain": "Global",
  "next_step": "1b_kartlagga",
  "ticket_id": "TCK-018",
  "active_skill": "gemini-livekit-translation-bridge"
}
```
