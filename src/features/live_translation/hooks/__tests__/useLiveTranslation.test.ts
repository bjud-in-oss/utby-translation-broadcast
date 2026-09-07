import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLiveTranslation } from "../useLiveTranslation";

class MockWebSocket {
  url: string;
  readyState = 1;
  binaryType = "blob";
  bufferedAmount = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.onopen?.();
    }, 5);
  }
}

class MockAudioWorklet {
  addModule = vi.fn().mockResolvedValue(undefined);
}

class MockAudioWorkletNode {
  port = {
    postMessage: vi.fn(),
    onmessage: null,
  };
  connect = vi.fn();
  disconnect = vi.fn();
  constructor(_ctx: unknown, _name: string) {}
}

class MockAudioContext {
  state = "running";
  sampleRate = 48000;
  audioWorklet = new MockAudioWorklet();
  destination = {};

  createMediaStreamSource = vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  createScriptProcessor = vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null,
  });
  createBuffer = vi.fn().mockReturnValue({
    getChannelData: () => new Float32Array(100),
  });
  createBufferSource = vi.fn().mockReturnValue({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
  });
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockImplementation(() => {
    this.state = "closed";
    return Promise.resolve();
  });
}

describe("useLiveTranslation Hook", () => {
  beforeEach(() => {
    (window as unknown as { WebSocket: unknown }).WebSocket = MockWebSocket;
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
    (window as unknown as { AudioWorkletNode: unknown }).AudioWorkletNode = MockAudioWorkletNode;

    // Mock navigator.mediaDevices
    const mockDevices = [
      { deviceId: "default", kind: "audioinput", label: "Standardmikrofon" },
      { deviceId: "mic-2", kind: "audioinput", label: "NDI Audio Input" },
    ];

    const mockTrack = {
      id: "track-1",
      kind: "audio",
      stop: vi.fn(),
    };

    const mockStream = {
      id: "stream-1",
      getTracks: () => [mockTrack],
    };

    Object.defineProperty(navigator, "mediaDevices", {
      writable: true,
      value: {
        enumerateDevices: vi.fn().mockResolvedValue(mockDevices),
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initieras med status 'idle' och standardspråk 'sv'", () => {
    const { result } = renderHook(() => useLiveTranslation());

    expect(result.current.status).toBe("idle");
    expect(result.current.targetLanguage).toBe("sv");
    expect(result.current.activeLanguages).toEqual(["sv"]);
    expect(result.current.audioLevel).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("ändrar målspråk och aktiva språk med toggleActiveLanguage", () => {
    const { result } = renderHook(() => useLiveTranslation());

    act(() => {
      result.current.toggleActiveLanguage("en");
    });
    expect(result.current.activeLanguages).toEqual(["sv", "en"]);

    act(() => {
      result.current.setTargetLanguage("en");
    });
    expect(result.current.targetLanguage).toBe("en");
  });

  it("låser upp och initierar AudioContext synkront via unlockAudioContext", () => {
    const { result } = renderHook(() => useLiveTranslation());

    act(() => {
      result.current.unlockAudioContext();
    });

    // Inget fel ska kastas och status förblir idle
    expect(result.current.status).toBe("idle");
  });

  it("startar tolkning och anropar getUserMedia samt stoppar med panicMute", async () => {
    const { result } = renderHook(() => useLiveTranslation());

    await act(async () => {
      await result.current.startTranslation();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();

    act(() => {
      result.current.panicMute();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.audioLevel).toBe(0);
  });
});
