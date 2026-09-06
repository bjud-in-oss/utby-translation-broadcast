/**
 * AudioResampler
 * Utför linjär interpolation och konvertering mellan Float32 och Int16 PCM.
 * Stödjer:
 * - 48 kHz Float32 (Web Audio) -> 16 kHz Int16 (Gemini Ingest)
 * - 24 kHz Int16 (Gemini Output) -> 48 kHz Float32 (Web Audio / LiveKit)
 * - Uppdelning i 480-samplers 20ms ramar för WebRTC pacing.
 */

export class AudioResampler {
  /**
   * Konverterar 48 kHz Float32 till 16 kHz Int16 med linjär nedsampling (faktor 3).
   */
  public static downsample48kTo16k(input: Float32Array): Int16Array {
    const ratio = 3;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const sample = input[i * ratio] ?? 0;
      // Kläm mellan -1.0 och 1.0 och skala till 16-bit signed integer
      const clamped = Math.max(-1, Math.min(1, sample));
      output[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }

    return output;
  }

  /**
   * Konverterar 24 kHz Int16 till 48 kHz Float32 med linjär interpolation (faktor 2).
   */
  public static upsample24kTo48k(input: Int16Array): Float32Array {
    const outputLength = input.length * 2;
    const output = new Float32Array(outputLength);

    for (let i = 0; i < input.length; i++) {
      const current = (input[i] ?? 0) / 0x7fff;
      const next = i + 1 < input.length ? (input[i + 1] ?? 0) / 0x7fff : current;

      output[i * 2] = current;
      output[i * 2 + 1] = (current + next) / 2;
    }

    return output;
  }

  /**
   * Delar upp en buffert av samplar i ramar med fast storlek (t.ex. 480 samplar).
   */
  public static sliceIntoFrames(
    samples: Int16Array,
    frameSize: number = 480
  ): Int16Array[] {
    const frames: Int16Array[] = [];
    let offset = 0;

    while (offset + frameSize <= samples.length) {
      frames.push(samples.slice(offset, offset + frameSize));
      offset += frameSize;
    }

    return frames;
  }

  /**
   * Konverterar Base64-sträng till Int16Array (Little-Endian).
   */
  public static base64ToInt16(base64: string): Int16Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
  }

  /**
   * Konverterar Int16Array till Base64-sträng (Little-Endian).
   */
  public static int16ToBase64(samples: Int16Array): string {
    const bytes = new Uint8Array(
      samples.buffer,
      samples.byteOffset,
      samples.byteLength
    );
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b !== undefined) {
        binary += String.fromCharCode(b);
      }
    }
    return btoa(binary);
  }
}
