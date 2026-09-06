---
name: livekit-client-audio
description: Instruktioner och kodmönster för att hantera LiveKit klientsidesljud (livekit-client) i webbläsaren. Täcker Safari iOS interrupted-hantering, inaktivering av lokal DSP på översatta spår, spårfiltrering och jitterbuffert.
---

# LiveKit Client Audio Guidelines

## 1. KRAV: Web Audio State & iOS Safari Interrupted
WebAudio-kontexten kan hamna i tillstånden `running`, `suspended`, `closed` eller `interrupted`[cite: 12]. iOS Safari sätter kontexten i `interrupted` vid skärmlåsning, samtal eller flikbyte[cite: 6].
* **Mandat:** Lyssna på `statechange` på `AudioContext` och anropa `.resume()` automatiskt när tillståndet blir `interrupted` eller `suspended`[cite: 4, 6].
* **Aktiv låsupplåsning:** Anropa alltid `AudioContext.resume()` inuti en reell användarinteraktion (klick/tap) innan ljud spelas upp[cite: 6].

## 2. KRAV: Inaktivera DSP på Översatta Spår
Lokal DSP (Echo Cancellation, Noise Suppression, Auto Gain Control) kan påverka den syntetiserade AI-rösten negativt och klippa frekvenser.
* **Broadcaster (Talare):** Tillåt DSP vid inspelning om headset inte används.
* **Listener (Åhörare):** Koppla bort alla webbläsarfilter vid publicering och uppspelning av översatta spår:
```typescript
const track = await createLocalAudioTrack(mediaStreamTrack, {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
});
```

## 3. KRAV: Spårfiltrering & Prenumeration
* **Mottagare (Listener):** Filteringslogik ska enbart prenumerera på och fästa spåret döpt till `translation_<lang_code>` (t.ex. `translation_sv`)[cite: 9].
* **Förhindra Eko hos Sändare:** Sändaren får ALDRIG fästa eller spela upp de översatta spår den själv skapar och publicerar till rummet.

## 4. PROGRESSIV KODREFERENS
Se källkodsfilen `assets/pattern-client-audio.ts` för fullständig implementation av rumanslutning, iOS Safari-återställning och spårhantering.
