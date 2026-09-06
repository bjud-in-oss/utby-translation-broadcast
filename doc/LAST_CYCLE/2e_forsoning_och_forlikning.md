# Steg 2e: Försoning och förlikning (TCK-021)

## 1. Målkonflikter och förlikningsbeslut
- **Målkonflikt 1 (Prestanda vs Filtreringsdjup i ljudresampling):** Ett tungt FIR/IIR-filter med många koefficienter kan belasta Web Audio tråden i webbläsaren.
  - *Förlikning:* Ett 3-punkts box filter / moving average ger utmärkt dämpning av speglingsfrekvenser över 8 kHz (Nyquist vid 16 kHz) med strikt $O(N)$ linjär tid och noll extra minnesallokering.
- **Målkonflikt 2 (Enhetsnamn före användargodkännande):** Webbläsare döljer av integritetsskäl etiketter före `getUserMedia`.
  - *Förlikning:* Visa tydliga platshållarnamn ("Standardljudkälla", "Ljudkälla 1") tills användaren startar strömmen, varvid listan omedelbart uppdateras till de skarpa källnamnen.

MÄTTNAD: JA
