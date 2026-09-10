# Steg 3b: Domänkontrakt och fraktal dokumentation (TCK-009)

## Domänkontrakt
- **Sample Rate:** 24 000 Hz.
- **Kanaler:** 1 (Mono).
- **Format:** Base64-kodat 16-bit signed PCM (`Int16Array` konverterat till `Float32Array` [-1.0, 1.0]).
- **Returtyp:**
  ```typescript
  export interface UseAudioPlayerReturn {
    initAudio: () => Promise<void>;
    playAudioChunk: (base64Data: string) => void;
    stopAudio: () => void;
  }
  ```
