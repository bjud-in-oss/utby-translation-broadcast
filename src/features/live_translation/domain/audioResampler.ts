/**
 * AudioResampler
 * Utför linjär interpolation och konvertering mellan Float32 och Int16 PCM.
 * Stödjer:
 * - 48 kHz Float32 (Web Audio) -> 16 kHz Int16 (Gemini Ingest) med anti-aliasing lågpassfilter
 * - 24 kHz Int16 (Gemini Output) -> 48 kHz Float32 (Web Audio / LiveKit)
 * - Uppdelning i 480-samplers 20ms ramar för WebRTC pacing.
 * - Base64 serialisering för WebSocket transport.
 */

export class AudioResampler {
  /**
   * Konverterar 48 kHz Float32 till 16 kHz Int16 med 3-punkts anti-aliasing lågpassfilter.
   * Ett glidande medelvärde (moving average) dämpar frekvenser över Nyquist-gränsen (8 kHz)
   * och förhindrar metalliskt aliasing-brus.
   */
  public static downsample48kTo16k(input: Float32Array): Int16Array {
    const ratio = 3;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const idx = i * ratio;
      // 3-punkts lågpassfiltrering (box filter) över samplarna innan decimering
      const s0 = input[idx] ?? 0;
      const s1 = input[idx + 1] ?? s0;
      const s2 = input[idx + 2] ?? s1;
      const filtered = (s0 + s1 + s2) / 3.0;

      // Kläm mellan -1.0 och 1.0 och skala till 16-bit signed integer
      const clamped = Math.max(-1, Math.min(1, filtered));
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
   * Konverterar Int16Array till Base64-sträng för WebSocket överföring.
   */
  public static int16ToBase64(samples: Int16Array): string {
    const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }

  /**
   * Konverterar Base64-sträng från Gemini Live API till Int16Array PCM.
   */
  public static base64ToInt16(base64: string): Int16Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
  }
}
