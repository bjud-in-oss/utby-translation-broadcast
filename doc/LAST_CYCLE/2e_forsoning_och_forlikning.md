# Steg 2e: Försoning och förlikning (TCK-004)

## 1. Målkonflikter och förlikningsbeslut
- **Målkonflikt 1 (Hård spärr vs Sessionsavbrott):** Ett hårt stopp vid 9 000 minuter avbryter pågående sändning abrupt om gränsen nås mitt under ett event.
  - *Förlikning:* De två förvarningarna vid 6 000 minuter (gul med möjlighet att stänga av tolkspår och därmed halvera förbrukningen) och 8 000 minuter (röd) ger arrangören god tid att agera. Bufferten på 1 000 minuter (10 %) till 10 000 garanterar nollkostnad.
- **Målkonflikt 2 (Koppling till DOM/localStorage vs Ren TS-arkitektur):** `quotaService.ts` ska spara till localStorage men måste förbli en ren TypeScript-modul utan externa eller fasta DOM-beroenden.
  - *Förlikning:* Injektera eller detektera en universell `StorageLike`-adapter. Om `window.localStorage` finns används den, annars faller tjänsten säkert tillbaka på intern minneslagring, vilket gör den fullständigt testbar i alla miljöer.

MÄTTNAD: JA
