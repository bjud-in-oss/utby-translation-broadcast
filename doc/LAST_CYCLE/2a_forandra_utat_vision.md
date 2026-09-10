# Steg 2a: Förändra utåt - Vision (TCK-009)

## Vision & Arkitektonisk anpassning
Vi etablerar Fas 1 i ROADMAP.md: En specialiserad React-hook `useAudioPlayer` under `src/features/live_translation/hooks/` som kapslar in den realtidsmässiga uppspelningsmotorn för tolkade ljudströmmar.

### Exponerat API
- `initAudio: () => Promise<void>`: Återupptar eller instansierar AudioContext vid användarinteraktion för att hantera browser autoplay policy.
- `playAudioChunk: (base64Data: string) => void`: Avkodar och schemalägger 24kHz Mono Int16 PCM-bitar med 40 ms jitterbuffert.
- `stopAudio: () => void`: Omedelbar panik-tystning av alla aktiva ljudkällor och återställning av tidsschemat.
