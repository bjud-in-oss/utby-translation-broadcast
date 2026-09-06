# Innehållsförteckning: Live Translation

## Översikt
Domänen `live_translation` tillhandahåller realtidsöversättning och
simultantolkning via Google Gemini Live och LiveKit SFU.

## Modulstruktur
- `domain/types.ts`: Typer för session, ljudramar och konfiguration.
- `domain/schema.ts`: Zod-scheman för körtidsvalidering.
- `domain/languages.ts`: Globalt språkbibliotek med 33 språk och regioner.
- `domain/multiBridgeOrchestrator.ts`: Parallella språkbryggor (translator-[kod]).
- `domain/audioResampler.ts`: Konvertering mellan 48kHz, 16kHz och 24kHz PCM.
- `domain/tokenService.ts`: LiveKit token-kontrakt och ephemeral hantering.
- `domain/hotSwapManager.ts`: Proaktiv 14-minuters rotation och session resumption.
- `domain/translationBridge.ts`: Huvudorkestrering av audio-bro och WebSocket.
- `hooks/useLiveTranslation.ts`: Reaktiv hook för tillstånd och kontroller.
- `components/LiveTranslationWidget.tsx`: Åtkomligt användargränssnitt.
