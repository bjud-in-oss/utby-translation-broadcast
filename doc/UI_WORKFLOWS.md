# Skärmflöden & Tillståndsmaskiner (doc/UI_WORKFLOWS.md)

Detta dokument beskriver applikationens interaktionsflöden och skärmtillstånd.

## Flöde: Exempelöversikt & Hantering
```text
[Startskärm / Översikt]
       │
       ├── (Klick på nytt objekt) ──► [Skapa / Redigera Dialog]
       │                                     │
       │                                     ▼
       │                              (Spara / Validera)
       │                                     │
       ◄─────────────────────────────────────┘
```

### Tillstånd för vy
1. **Laddar (Loading)**: Visar skeleton eller laddningsindikator.
2. **Tom lista (Empty)**: Visar hjälpsam text och en primär handlingsknapp.
3. **Data (Populated)**: Renderar objekt och filterkontroller.
4. **Fel (Error)**: Visar pedagogiskt felmeddelande med möjlighet att försöka igen.
