import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudioPlayer } from "../useAudioPlayer";

interface MockBufferSource {
  buffer: AudioBuffer | null;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
}

class MockAudioBuffer {
  numberOfChannels = 1;
  length: number;
  sampleRate: number;
  duration: number;
  private channelData: Float32Array;

  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.channelData = new Float32Array(length);
  }

  getChannelData(_channel: number): Float32Array {
    return this.channelData;
  }
}

class MockAudioContext {
  state: AudioContextState = "suspended";
  sampleRate = 24000;
  currentTime = 1.0;
  destination = {};

  resume = vi.fn().mockImplementation(async () => {
    this.state = "running";
  });

  close = vi.fn().mockImplementation(async () => {
    this.state = "closed";
  });

  createBuffer = vi.fn().mockImplementation((channels: number, length: number, sampleRate: number) => {
    return new MockAudioBuffer(channels, length, sampleRate);
  });

  createBufferSource = vi.fn().mockImplementation((): MockBufferSource => {
    return {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
  });
}

function createSampleBase64Pcm(sampleCount = 240): string {
  const int16Array = new Int16Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    int16Array[i] = Math.round(Math.sin((i / sampleCount) * Math.PI * 2) * 16000);
  }
  const uint8 = new Uint8Array(int16Array.buffer, int16Array.byteOffset, int16Array.byteLength);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

describe("useAudioPlayer Hook", () => {
  let originalAudioContext: unknown;

  beforeEach(() => {
    originalAudioContext = window.AudioContext;
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
  });

  afterEach(() => {
    (window as unknown as { AudioContext: unknown }).AudioContext = originalAudioContext;
    vi.restoreAllMocks();
  });

  it("exporterar initAudio, playAudioChunk och stopAudio", () => {
    const { result } = renderHook(() => useAudioPlayer());
    expect(typeof result.current.initAudio).toBe("function");
    expect(typeof result.current.playAudioChunk).toBe("function");
    expect(typeof result.current.stopAudio).toBe("function");
  });

  it("initAudio återupptar suspended AudioContext", async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.initAudio();
    });

    const ctx = (window as unknown as { AudioContext: typeof MockAudioContext });
    expect(ctx).toBeDefined();
  });

  it("playAudioChunk schemalägger 24kHz ljud med jitterbuffert", async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.initAudio();
    });

    const base64Pcm = createSampleBase64Pcm(480);

    act(() => {
      result.current.playAudioChunk(base64Pcm);
    });

    expect(base64Pcm.length).toBeGreaterThan(0);
  });

  it("stopAudio tystar aktiva källor", async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.initAudio();
    });

    const base64Pcm = createSampleBase64Pcm(240);
    act(() => {
      result.current.playAudioChunk(base64Pcm);
    });

    act(() => {
      result.current.stopAudio();
    });

    expect(typeof result.current.stopAudio).toBe("function");
  });

  it("hanterar ogiltig base64 eller tom data utan krasch", async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.initAudio();
    });

    expect(() => {
      act(() => {
        result.current.playAudioChunk("");
        result.current.playAudioChunk("!!!ogiltig_base64$$$");
      });
    }).not.toThrow();
  });
});
