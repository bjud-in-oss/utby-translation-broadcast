# Steg 3b: Domänkontrakt och fraktal dokumentation (TCK-019)

## 1. Nya typer och schemakontrakt
- `SupportedLanguage`: Utökad union med 33 språk (`sw`, `so`, `am`, `sv`, `no`, `da`, `fi`, `en`, `es`, `de`, `fr`, `it`, `pt`, `nl`, `el`, `uk`, `pl`, `ru`, `ro`, `hu`, `cs`, `sk`, `bg`, `ar`, `fa`, `ku`, `tr`, `he`, `zh`, `ja`, `ko`, `hi`, `ur`, `vi`, `th`, `tl`, `id`).
- `LanguageDefinition`: `{ code: SupportedLanguage, name: string, region: string }`.
- `MultiTranslationConfig`: `{ sessionName: string, targetLanguages: SupportedLanguage[], inputDeviceId?: string }`.
- `MultiBridgeOrchestrator`: Metoder för `startLanguage(lang)`, `stopLanguage(lang)`, `sendAudioChunk(samples)`.

## 2. Lokala dokumentationsregler (max 40 rader per fil)
- `doc/BUSINESS_RULES.md`: Uppdateras med regler för NDI deviceId, parallella translator-bots och selektiv lyssnarmutning.
- `doc/INTEGRATIONS.md`: Uppdateras med specifikation för `enumerateDevices()`, NDI-ingångar och LiveKit multi-track.
- `doc/INDEX.md`: Inkluderar `domain/languages.ts` och `domain/multiBridgeOrchestrator.ts`.
- `doc/UI_WORKFLOWS.md`: Beskriver arrangörsflödet (välja mikrofon + aktivera flera språk) och lyssnarflödet (välja eget språk).
