# Steg 3b: Domänkontrakt och fraktal dokumentation (TCK-017)

## 1. Zod-validerade domänkontrakt (`schema.ts`)
```typescript
import { z } from "zod";

export const SupportedLanguageSchema = z.enum(["sv", "en", "es", "de", "fr", "ja", "zh"]);

export const LiveKitTokenRequestSchema = z.object({
  roomName: z.string().min(1),
  participantIdentity: z.string().min(1),
  role: z.enum(["broadcaster", "listener", "bridge_bot"]),
  targetLanguage: SupportedLanguageSchema.optional(),
});

export const TranslationSessionConfigSchema = z.object({
  targetLanguage: SupportedLanguageSchema,
  echoTargetLanguage: z.boolean().default(false),
  sampleRateInput: z.number().default(16000),
  sampleRateOutput: z.number().default(24000),
  framePacingMs: z.number().default(20),
  samplesPerFrame: z.number().default(480),
  maxBufferedBytes: z.number().default(131072), // 128 KB
});
```

## 2. Fraktala dokumentationskrav
Lokal dokumentation under `src/features/live_translation/doc/`:
- `BUSINESS_RULES.md`: Regler för tolkning, tystnadsfiltrering och sessionslängd (max 40 rader).
- `INTEGRATIONS.md`: Specifikation för WebSocket och LiveKit SFU (max 40 rader).
- `INDEX.md`: Innehållsförteckning och översikt (max 40 rader).
- `UI_WORKFLOWS.md`: Arbetsflöden för användargränssnittet (max 40 rader).
