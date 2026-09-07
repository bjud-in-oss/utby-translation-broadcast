import { describe, it, expect } from "vitest";
import { AudioResampler } from "../audioResampler";

describe("AudioResampler with Anti-Aliasing Filter", () => {
  it("downsamples 48kHz to 16kHz with exactly 1/3 sample count", () => {
    const input = new Float32Array(480);
    for (let i = 0; i < input.length; i++) {
      input[i] = Math.sin((i / 480) * 2 * Math.PI);
    }

    const output = AudioResampler.downsample48kTo16k(input);
    expect(output.length).toBe(160);
  });

  it("applies anti-aliasing low-pass filter to attenuate high frequency noise", () => {
    // Alternating high frequency signal (+1.0, -1.0, +1.0, -1.0, ...)
    const input = new Float32Array([1.0, -1.0, 1.0, -1.0, 1.0, -1.0]);
    const output = AudioResampler.downsample48kTo16k(input);

    expect(output.length).toBe(2);
    // Without filter, input[0] was 1.0 (approx 32767).
    // With 3-point average, (1.0 - 1.0 + 1.0) / 3 = 0.3333, so sample value is attenuated to ~10922.
    expect(output[0]).toBeLessThan(15000);
    expect(output[0]).toBeGreaterThan(10000);
  });

  it("preserves constant DC signal level through the filter", () => {
    const input = new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    const output = AudioResampler.downsample48kTo16k(input);

    expect(output.length).toBe(2);
    // (0.5 + 0.5 + 0.5) / 3 = 0.5, scaled to 0x7fff (16383.5 -> 16383)
    expect(output[0]).toBeCloseTo(16383, -1);
    expect(output[1]).toBeCloseTo(16383, -1);
  });

  it("clamps audio samples to prevent 16-bit integer overflow", () => {
    const input = new Float32Array([2.5, 3.0, 4.0, -2.5, -3.0, -4.0]);
    const output = AudioResampler.downsample48kTo16k(input);

    expect(output[0]).toBe(32767);
    expect(output[1]).toBe(-32768);
  });

  it("upsamples 24kHz to 48kHz with interpolation", () => {
    const input = new Int16Array([16000, 32000]);
    const output = AudioResampler.upsample24kTo48k(input);

    expect(output.length).toBe(4);
    expect(output[0]).toBeCloseTo(16000 / 0x7fff, 2);
  });

  it("slices samples into fixed frame sizes", () => {
    const input = new Int16Array(1000);
    const frames = AudioResampler.sliceIntoFrames(input, 480);

    expect(frames.length).toBe(2);
    expect(frames[0]?.length).toBe(480);
    expect(frames[1]?.length).toBe(480);
  });
});
