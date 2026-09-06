# Steg 1b: Kartlägga (TCK-018: Global / App.tsx)

## 1. Besvarande av GROW-frågorna mot Risknoder

### Svar GROW 1 (State & UI Architecture):
`App.tsx` hålls som en strikt presentations- och layoutram utan lokal affärslogik eller tillståndshantering (`useState`/`useEffect`: 0 st). Den bäddar in `<LiveTranslationWidget />` direkt i en flexibel och centrerad container.

### Svar GROW 2 (Contract & Imports):
Fasadimporten sker exklusivt via `import { LiveTranslationWidget } from "./features/live_translation";`. Referensen till `ExampleWidget` och `example_feature` avlägsnas helt från `App.tsx`.

### Svar GROW 3 (Effects & Resilience):
Layouten utformas med god kontrast och mobilanpassning: `min-h-screen bg-stone-100 text-stone-900 flex flex-col items-center justify-center p-4 sm:p-6`. Rubriken uppdateras till "Live Translation" med en kort förklarande undertitel om realtids simultantolkning.

---

## 2. Arkitekturkartläggning för berörda filer

```text
src/
├── App.tsx                     # Rotvy som renderar LiveTranslationWidget
└── __tests__/
    └── App.test.tsx            # Test som verifierar att LiveTranslationWidget renderas i App
```

---

```json
{
  "active_vectors": ["app_widget_integration"],
  "status": "IN_PROGRESS",
  "current_domain": "Global",
  "next_step": "2a_forandra_utat_vision",
  "ticket_id": "TCK-018"
}
```
