# Steg 1b: Kartlägga (TCK-020: Tillämpa Design Variation 3 på LiveTranslationWidget)

## 1. Besvarande av GROW-frågorna mot Risknoder

### Svar GROW 1 (Designkompatibilitet och IDs):
Alla befintliga element-ID:n behålls: `live-translation-container`, `translation-title`, `status-badge`, `audio-device-select`, `target-lang-select`, `audio-level-meter`, `audio-level-fill`, `toggle-translation-btn` och `panic-mute-btn`. Aria-labels och semantiska attribut bevaras.

### Svar GROW 2 (120-radersgräns och max 3 hooks):
`LiveTranslationWidget.tsx` anropar endast 1 hook (`useLiveTranslation`) och hålls strikt under 115 rader.

### Svar GROW 3 (Panik-tystning och Statusvisning):
Statusindikatorn renderas i `Space Mono` med accentfärgen `#5e6ef2`. Panik-tystningsknappen renderas i matchande minimalistisk stil vid aktiv status.

---

## 2. Arkitekturkartläggning för berörda filer

```text
src/features/live_translation/
├── components/
│   ├── LiveTranslationWidget.tsx # Uppdaterad med Variation 3 design
│   └── __tests__/
│       └── LiveTranslationWidget.test.tsx # Verifierande TDD-tester
├── doc/
│   ├── BUSINESS_RULES.md
│   ├── INTEGRATIONS.md
│   ├── INDEX.md
│   └── UI_WORKFLOWS.md
```

---

```json
{
  "active_vectors": ["design_variation_widget"],
  "status": "IN_PROGRESS",
  "current_domain": "live_translation",
  "next_step": "2a_forandra_utat_vision",
  "ticket_id": "TCK-020"
}
```
