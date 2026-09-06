# Steg 1b: Kartlägga (TCK-019: Enhetsval, parallell tolkning & utökat språkbibliotek)

## 1. Besvarande av GROW-frågorna mot Risknoder

### Svar GROW 1 (Enhetsval & NDI Audio):
`useLiveTranslation` utökas med `audioDevices: MediaDeviceInfo[]` och `selectedDeviceId: string`. Vid initiering körs `navigator.mediaDevices.enumerateDevices()` för att lista alla `audioinput`-källor (inklusive virtuella kablar som "NDI Webcam Input"). Vid anslutning skickas `deviceId: { exact: selectedDeviceId }` till `getUserMedia` samt motsvarande inställning till ljudspår.

### Svar GROW 2 (Parallell flerspråksöversättning):
Skapar `MultiBridgeOrchestrator` under `domain/multiBridgeOrchestrator.ts`. Den håller en samling av `TranslationBridge`-instanser – en per aktivt språk (`translator-[språkkod]`). Mikrofonljudet dupliceras till varje aktiv brygga. I lyssnarvyn prenumereras/spelas endast vald språkröst upp medan övriga spår tystas.

### Svar GROW 3 (Maximalt utökat språkbibliotek inkl. Swahili):
Skapar `domain/languages.ts` som definierar alla efterfrågade språkstrukturer uppdelade per region:
- **Afrikanska:** Swahili (`sw`), Somaliska (`so`), Amhariska (`am`)
- **Nordiska:** Svenska (`sv`), Norska (`no`), Danska (`da`), Finska (`fi`)
- **Väst- & Sydeuropeiska:** Engelska (`en`), Spanska (`es`), Tyska (`de`), Franska (`fr`), Italienska (`it`), Portugisiska (`pt`), Nederländska (`nl`), Grekiska (`el`)
- **Östeuropeiska:** Ukrainska (`uk`), Polska (`pl`), Ryska (`ru`), Rumänska (`ro`), Ungerska (`hu`), Tjeckiska (`cs`), Slovakiska (`sk`), Bulgariska (`bg`)
- **Mellanöstern & Centralasien:** Arabiska (`ar`), Persiska (`fa`), Kurdiska (`ku`), Turkiska (`tr`), Hebreiska (`he`)
- **Asien & Sydasien:** Kinesiska (`zh`), Japanska (`ja`), Koreanska (`ko`), Hindi (`hi`), Urdu (`ur`), Vietnamesiska (`vi`), Thailändska (`th`), Tagalog (`tl`), Indonesiska (`id`)
Schemat i `schema.ts` och typer i `types.ts` härleds direkt från detta bibliotek.

---

## 2. Arkitekturkartläggning för berörda filer

```text
src/features/live_translation/
├── domain/
│   ├── languages.ts              # Utökat språkbibliotek & kategorier
│   ├── types.ts                  # Uppdaterade typer för enheter och flerspråk
│   ├── schema.ts                 # Zod-validering för utökat språkbibliotek
│   ├── multiBridgeOrchestrator.ts # Orkestrering av parallella språkbryggor
│   └── translationBridge.ts      # Identifiering per språk (translator-[kod])
├── hooks/
│   └── useLiveTranslation.ts     # Enhetsenumerering, flerspråksval, selektiv uppspelning
├── components/
│   ├── LiveTranslationWidget.tsx # UI med enhetsväljare och flerspråkspanel
│   └── __tests__/
│       └── LiveTranslationWidget.test.tsx # Utökade TDD-tester
├── index.ts                      # Uppdaterad fasadexport
└── doc/
    ├── BUSINESS_RULES.md         # Affärsregler för enhetsval & flerspråk
    ├── INTEGRATIONS.md           # NDI audio & LiveKit identitetsspecifikation
    ├── INDEX.md                  # Registrering av nya filer
    └── UI_WORKFLOWS.md           # Flöden för arrangör och lyssnare
```

---

```json
{
  "active_vectors": ["multilang_device_bridge"],
  "status": "IN_PROGRESS",
  "current_domain": "live_translation",
  "next_step": "2a_forandra_utat_vision",
  "ticket_id": "TCK-019"
}
```
