# Steg 1b: Kartlägga (TCK-021: AudioResampler anti-aliasing, enhetsbehörighet och ren röstinsignal)

## 1. Besvarande av GROW-frågorna mot Risknoder

### Svar GROW 1 (AudioResampler DSP & Aliasing):
I `AudioResampler.downsample48kTo16k(input: Float32Array): Int16Array` appliceras ett anti-aliasing lågpassfilter (3-punkts box filter / moving average). Varje utsampel beräknas som snittet av tre på varandra följande insignalssamplar innan det skalas och klampas till Int16:
`val = (input[srcIdx] + input[srcIdx + 1] + input[srcIdx + 2]) / 3.0`
Detta eliminerar speglingsartefakter över 8 kHz och ger en ren, naturlig röstsignal till Gemini Live API.

### Svar GROW 2 (Enhetshantering och behörighet):
`useLiveTranslation` förbättras så att:
1. `refreshAudioDevices()` körs initialt och vid `devicechange`.
2. Om enheter saknar `label` sätts tydliga reservnamn (t.ex. "Ljudenhet 1 (ej beviljad behörighet)").
3. Vid anrop till `startTranslation()` (då `getUserMedia` beviljas) görs en direkt förnyad enumerering som ersätter tomma etiketter med skarpa enhetsnamn (t.ex. "NDI Webcam Input").

### Svar GROW 3 (Rad- och hookbegränsningar):
`LiveTranslationWidget.tsx` förblir under 120 rader med endast 1 hook (`useLiveTranslation`).

---

## 2. Arkitekturkartläggning för berörda filer

```text
src/features/live_translation/
├── domain/
│   └── audioResampler.ts # Anti-aliasing filter implementeras här
├── hooks/
│   └── useLiveTranslation.ts # Robustare enhetsenumerering & behörighetsuppdatering
├── components/
│   ├── LiveTranslationWidget.tsx # Gränssnitt med ren visualisering
│   └── __tests__/
│       ├── LiveTranslationWidget.test.tsx # UI-tester
│       └── audioResampler.test.ts # Ny dedikerad testsvit för anti-aliasing
├── doc/
│   ├── BUSINESS_RULES.md
│   ├── INTEGRATIONS.md
│   ├── INDEX.md
│   └── UI_WORKFLOWS.md
```

---

```json
{
  "active_vectors": ["resampler_device_quality"],
  "status": "IN_PROGRESS",
  "current_domain": "live_translation",
  "next_step": "2a_forandra_utat_vision",
  "ticket_id": "TCK-021"
}
```
