import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TranslationBridge } from "../translationBridge";

// Mock WebSocket
class MockWebSocket {
  public static instances: MockWebSocket[] = [];
  public readyState: number = 1;
  public bufferedAmount = 0;
  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onerror: ((evt: unknown) => void) | null = null;
  public onclose: ((evt: { code?: number }) => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 3;
    if (this.onclose) this.onclose({ code: 1000 });
  });
  addEventListener = vi.fn((event: string, cb: () => void) => {
    if (event === "open") setTimeout(cb, 0);
  });
}

describe("TranslationBridge Specifications", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("skickar setup-payload med slidingWindow och targetLanguage vid anslutning", () => {
    const bridge = new TranslationBridge("test-key", "sv", {
      onAudioData: vi.fn(),
      onStatusChange: vi.fn(),
      onError: vi.fn(),
    });
    bridge.connect();
    expect(MockWebSocket.instances.length).toBe(1);
    const ws = MockWebSocket.instances[0]!;
    vi.advanceTimersByTime(10);

    expect(ws.send).toHaveBeenCalled();
    const payload = JSON.parse(ws.send.mock.calls[0][0]);
    expect(payload.setup).toBeDefined();
    expect(payload.setup.contextWindowCompressionConfig).toEqual({ slidingWindow: {} });
    expect(payload.setup.generationConfig.translationConfig.targetLanguageCode).toBe("sv");
  });

  it("droppar ljudramar vid backpressure när ws.bufferedAmount > 128 KB", () => {
    const bridge = new TranslationBridge("test-key", "sv", {
      onAudioData: vi.fn(),
      onStatusChange: vi.fn(),
      onError: vi.fn(),
    });
    bridge.connect();
    vi.advanceTimersByTime(10);
    const ws = MockWebSocket.instances[0]!;
    ws.send.mockClear();

    ws.bufferedAmount = 128 * 1024 + 1;
    const samples = new Int16Array(1600);
    bridge.sendAudioChunk(samples);
    expect(ws.send).not.toHaveBeenCalled();

    ws.bufferedAmount = 64 * 1024;
    bridge.sendAudioChunk(samples);
    expect(ws.send).toHaveBeenCalledTimes(1);
  });

  it("paketerar ljud i 100 ms-ramar (1600 samplar vid 16 kHz) för 10 Hz sändningsfrekvens", () => {
    const bridge = new TranslationBridge("test-key", "sv", {
      onAudioData: vi.fn(),
      onStatusChange: vi.fn(),
      onError: vi.fn(),
    });
    bridge.connect();
    vi.advanceTimersByTime(10);
    const ws = MockWebSocket.instances[0]!;
    ws.send.mockClear();

    const halfChunk = new Int16Array(800);
    bridge.enqueueAudioSamples(halfChunk);
    expect(ws.send).not.toHaveBeenCalled();

    bridge.enqueueAudioSamples(halfChunk);
    expect(ws.send).toHaveBeenCalledTimes(1);
  });

  it("uppdaterar hot-swap resumption handle från sessionResumptionUpdate", () => {
    const bridge = new TranslationBridge("test-key", "sv", {
      onAudioData: vi.fn(),
      onStatusChange: vi.fn(),
      onError: vi.fn(),
    });
    bridge.connect();
    vi.advanceTimersByTime(10);
    const ws = MockWebSocket.instances[0]!;

    if (ws.onmessage) {
      ws.onmessage({
        data: JSON.stringify({ sessionResumptionUpdate: { newHandle: "resumption-token-xyz" } }),
      });
    }
    expect(bridge.getResumptionHandle()).toBe("resumption-token-xyz");
  });

  it("hanterar goAway och utlöser hot-swap innan timeLeft går ut", () => {
    const statusChanges: string[] = [];
    const bridge = new TranslationBridge("test-key", "sv", {
      onAudioData: vi.fn(),
      onStatusChange: (status) => statusChanges.push(status),
      onError: vi.fn(),
    });
    bridge.connect();
    vi.advanceTimersByTime(10);
    const ws = MockWebSocket.instances[0]!;

    if (ws.onmessage) {
      ws.onmessage({ data: JSON.stringify({ goAway: { timeLeft: 5000 } }) });
    }

    vi.advanceTimersByTime(2900);
    expect(MockWebSocket.instances.length).toBe(1);

    vi.advanceTimersByTime(200);
    expect(MockWebSocket.instances.length).toBe(2);
    expect(statusChanges).toContain("rotating");
  });

  it("tillämpar adaptiv slew och clamping vid resampling", () => {
    const bridge = new TranslationBridge("test-key", "sv", {
      onAudioData: vi.fn(),
      onStatusChange: vi.fn(),
      onError: vi.fn(),
    });

    expect(bridge.clampSample(1.5)).toBe(1);
    expect(bridge.clampSample(-1.5)).toBe(-1);
    expect(bridge.clampSample(0.42)).toBe(0.42);

    const slew = bridge.getAdaptiveSlewRate();
    expect(slew).toBeGreaterThanOrEqual(0.95);
    expect(slew).toBeLessThanOrEqual(1.05);
  });

  it("tar emot 24 kHz audio-chunks från Gemini och anropar onAudioData", () => {
    const onAudioData = vi.fn();
    const bridge = new TranslationBridge("test-key", "sv", {
      onAudioData,
      onStatusChange: vi.fn(),
      onError: vi.fn(),
    });
    bridge.connect();
    vi.advanceTimersByTime(10);
    const ws = MockWebSocket.instances[0]!;

    // Skicka base64-ljuddata
    const dummyBase64 = "AAAA////";
    if (ws.onmessage) {
      ws.onmessage({
        data: JSON.stringify({
          serverContent: {
            modelTurn: {
              parts: [{ inlineData: { data: dummyBase64 } }],
            },
          },
        }),
      });
    }

    expect(onAudioData).toHaveBeenCalled();
    expect(bridge.getAdaptiveSlewRate()).toBeGreaterThanOrEqual(0.95);
  });

  it("avslutar och frigör resurser vid dispose och destroy", () => {
    const statusChanges: string[] = [];
    const bridge = new TranslationBridge("test-key", "sv", {
      onAudioData: vi.fn(),
      onStatusChange: (status) => statusChanges.push(status),
      onError: vi.fn(),
    });
    bridge.connect();
    vi.advanceTimersByTime(10);
    const ws = MockWebSocket.instances[0]!;

    bridge.enqueueAudioSamples(new Int16Array(200));
    bridge.dispose();

    expect(ws.close).toHaveBeenCalled();
    expect(statusChanges).toContain("idle");

    // Testa destroy som alias
    bridge.connect();
    vi.advanceTimersByTime(10);
    bridge.destroy();
    expect(statusChanges.filter((s) => s === "idle").length).toBeGreaterThanOrEqual(2);
  });

  it("kopplar SFU-ström via attachSFUStream", () => {
    const mockConnect = vi.fn();
    const mockSrc = { connect: mockConnect };
    const mockProc = { connect: mockConnect, onaudioprocess: null };
    const mockCreateScriptProcessor = vi.fn().mockReturnValue(mockProc);
    const mockCreateMediaStreamSource = vi.fn().mockReturnValue(mockSrc);
    const mockClose = vi.fn().mockResolvedValue(undefined);

    const MockAudioContext = vi.fn().mockImplementation(() => ({
      sampleRate: 48000,
      state: "running",
      destination: {},
      createMediaStreamSource: mockCreateMediaStreamSource,
      createScriptProcessor: mockCreateScriptProcessor,
      close: mockClose,
    }));
    vi.stubGlobal("AudioContext", MockAudioContext);

    const bridge = new TranslationBridge("test-key", "sv", {
      onAudioData: vi.fn(),
      onStatusChange: vi.fn(),
      onError: vi.fn(),
    });

    const mockStream = {} as MediaStream;
    bridge.attachSFUStream(mockStream);

    expect(mockCreateMediaStreamSource).toHaveBeenCalledWith(mockStream);
    expect(mockCreateScriptProcessor).toHaveBeenCalledWith(4096, 1, 1);
    expect(mockConnect).toHaveBeenCalledTimes(2);

    bridge.dispose();
    expect(mockClose).toHaveBeenCalled();
  });
});
