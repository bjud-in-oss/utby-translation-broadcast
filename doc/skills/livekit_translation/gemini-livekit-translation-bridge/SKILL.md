---
name: gemini-livekit-translation-bridge
description: Bygger och hanterar bryggan mellan LiveKit SFU och Gemini Live Translate (gemini-3.5-live-translate-preview). Täcker 3-stegs PCM-resampling, 1008/1011 felhantering och backpressure.
---

# Gemini LiveTranslate & LiveKit SFU Bridge

## 1. KRAV: Förebygg Felkoder 1008 & 1011 på WebSocket
* **Inga Text/Tools Payload:** När `translationConfig` används i Gemini Live Translate tillåts ENBART råa PCM-ljudchunks[cite: 27, 29, 32].
* **Skicka ALDRIG** `clientContent`, `tools` eller `systemInstruction` under pågående översättning – det utlöser omedelbart felkod `1008` (Policy Violation) eller `1011` (Internal Error) och stänger sessionen[cite: 29, 32].

## 2. KRAV: Trestegs PCM-Resampling
* **LiveKit In (Talare):** 48 000 Hz Float32 PCM[cite: 27].
* **Gemini Input:** Konvertera till 16 000 Hz Int16 Little-Endian PCM i block om ~100 ms[cite: 27].
* **Gemini Output:** Tar emot 24 000 Hz Int16 Little-Endian PCM[cite: 27].
* **LiveKit Re-publish (SFU):** Konvertera 24 kHz Int16 till 48 kHz Float32 innan det matas in i LiveKits `AudioSource`[cite: 27].

## 3. KRAV: Backpressure & Minneskontroll
För att förhindra att serverns/klientens minne svämmar över vid kontinuerlig strömning[cite: 26, 34]:
* Övervaka `ws.bufferedAmount`. Om kön överstiger High-Watermark (t.ex. 1 MB) måste tillfällig paus i insamlingen ske tills `drain`-händelsen utlöses[cite: 26, 34].

## 4. PROGRESSIV KODREFERENS
Läs källkodsfilen `assets/pattern-translation-bridge.ts` för fullständig bryggimplementation med resampling och WebSocket-hantering.
