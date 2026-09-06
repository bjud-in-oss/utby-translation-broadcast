# Steg 2e: Försoning och förlikning (TCK-018)

## 1. Målkonflikter och förlikningsbeslut
- **Konflikt:** Ska `App.tsx` hålla koll på global session eller mikrofonstatus kontra hålla rotkomponenten helt fri från logik?
- **Försoning:** `LiveTranslationWidget` kapslar in sitt eget tillstånd och sina egna sidoeffekter fullständigt. `App.tsx` förblir en ren layoutbehållare utan hooks.

MÄTTNAD: JA
