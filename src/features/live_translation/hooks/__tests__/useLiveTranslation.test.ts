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
    setTimeout(() => { this.onopen?.(); }, 5);
  }
}

class MockAudioWorklet {
  addModule = vi.fn().mockResolvedValue(undefined);
}

class MockAudioWorkletNode {
  port = { postMessage: vi.fn(), onmessage: null };
  connect = vi.fn();
  disconnect = vi.fn();
  constructor(_ctx: unknown, _name: string) {}
}

class MockAudioContext {
  state = "running";
  sampleRate = 48000;
  audioWorklet = new MockAudioWorklet();
  destination = {};
  createMediaStreamSource = vi.fn().mockReturnValue({ connect: vi.fn(), disconnect: vi.fn() });
  createBuffer = vi.fn().mockReturnValue({ getChannelData: () => new Float32Array(100) });
  createBufferSource = vi.fn().mockReturnValue({ buffer: null, connect: vi.fn(), start: vi.fn() });
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockImplementation(() => { this.state = "closed"; return Promise.resolve(); });
}

describe("useLiveTranslation Hook", () => {
  beforeEach(() => {
    (window as unknown as { WebSocket: unknown }).WebSocket = MockWebSocket;
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
    (window as unknown as { AudioWorkletNode: unknown }).AudioWorkletNode = MockAudioWorkletNode;

    const mockDevices = [
      { deviceId: "default", kind: "audioinput", label: "Standardmikrofon" },
      { deviceId: "mic-2", kind: "audioinput", label: "NDI Audio Input" },
    ];
    const mockTrack = { id: "track-1", kind: "audio", stop: vi.fn() };
    const mockStream = {
      id: "stream-1",
      getTracks: () => [mockTrack],
      getAudioTracks: () => [mockTrack],
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

  it("initieras med status 'idle', standardspråk 'sv' och transportMode 'sfu'", () => {
    const { result } = renderHook(() => useLiveTranslation());
    expect(result.current.status).toBe("idle");
    expect(result.current.targetLanguage).toBe("sv");
    expect(result.current.activeLanguages).toEqual(["sv"]);
    expect(result.current.transportMode).toBe("sfu");
    expect(result.current.audioLevel).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("ändrar målspråk och aktiva språk med toggleActiveLanguage och setTargetLanguage", () => {
    const { result } = renderHook(() => useLiveTranslation());
    act(() => { result.current.toggleActiveLanguage("en"); });
    expect(result.current.activeLanguages).toEqual(["sv", "en"]);
    act(() => { result.current.setTargetLanguage("en"); });
    expect(result.current.targetLanguage).toBe("en");
  });

  it("tillåter byte av transportMode mellan sfu och local_ws", () => {
    const { result } = renderHook(() => useLiveTranslation());
    expect(result.current.transportMode).toBe("sfu");
    act(() => { result.current.setTransportMode("local_ws"); });
    expect(result.current.transportMode).toBe("local_ws");
    act(() => { result.current.setTransportMode("sfu"); });
    expect(result.current.transportMode).toBe("sfu");
  });

  it("låser upp och initierar AudioContext synkront via unlockAudioContext", () => {
    const { result } = renderHook(() => useLiveTranslation());
    act(() => { result.current.unlockAudioContext(); });
    expect(result.current.status).toBe("idle");
  });

  it("startar tolkning med SFU-transport och laddar MicCapture worklet med flexibla constraints", async () => {
    const { result } = renderHook(() => useLiveTranslation());
    await act(async () => {
      await result.current.startTranslation();
    });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: { ideal: 16000 },
      },
    });
    act(() => { result.current.panicMute(); });
    expect(result.current.status).toBe("idle");
    expect(result.current.audioLevel).toBe(0);
  });

  it("anropar getUserMedia med flexibla enhetsconstraints vid vald mikrofon", async () => {
    const { result } = renderHook(() => useLiveTranslation());
    act(() => { result.current.setSelectedDeviceId("mic-2"); });
    await act(async () => {
      await result.current.startTranslation();
    });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: { ideal: 16000 },
        deviceId: { ideal: "mic-2" },
      },
    });
  });

  it("fångar och hanterar OverconstrainedError graciöst vid ljudfångst", async () => {
    const overconstrainedErr = new Error("Requested device constraints not available");
    overconstrainedErr.name = "OverconstrainedError";
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(overconstrainedErr);

    const { result } = renderHook(() => useLiveTranslation());
    await act(async () => {
      await result.current.startTranslation();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Requested device constraints not available");
  });

  it("startar tolkning med local_ws och kopplar ner vid transportbyte och stopTranslation", async () => {
    const { result } = renderHook(() => useLiveTranslation());
    act(() => { result.current.setTransportMode("local_ws"); });
    await act(async () => {
      await result.current.startTranslation();
    });
    expect(result.current.transportMode).toBe("local_ws");

    act(() => {
      result.current.setTransportMode("sfu");
    });
    expect(result.current.transportMode).toBe("sfu");

    act(() => {
      result.current.stopTranslation();
    });
    expect(result.current.status).toBe("idle");
  });
});

