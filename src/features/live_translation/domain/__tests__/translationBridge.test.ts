import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TranslationBridge } from "../translationBridge";

// Mock WebSocket
class MockWebSocket {
  public static instances: MockWebSocket[] = [];
  public readyState: number = 1; // WebSocket.OPEN
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
    this.readyState = 3; // WebSocket.CLOSED
    if (this.onclose) this.onclose({ code: 1000 });
  });
  addEventListener = vi.fn((event: string, cb: () => void) => {
    if (event === "open") {
      setTimeout(cb, 0);
    }
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

    // Sätt bufferedAmount till över 128 KB (131073 bytes)
    ws.bufferedAmount = 128 * 1024 + 1;
    const samples = new Int16Array(1600);
    bridge.sendAudioChunk(samples);

    // Ska INTE ha anropat ws.send på grund av backpressure
    expect(ws.send).not.toHaveBeenCalled();

    // Återställ till under 128 KB
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

    // Skicka 800 samplar (50 ms) -> ska buffras, inte skickas än
    const halfChunk = new Int16Array(800);
    bridge.enqueueAudioSamples(halfChunk);
    expect(ws.send).not.toHaveBeenCalled();

    // Skicka 800 samplar till -> totalt 1600 (100 ms) -> ska skickas
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
        data: JSON.stringify({
          sessionResumptionUpdate: { newHandle: "resumption-token-xyz" },
        }),
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

    // Skicka GoAway med 5000 ms timeLeft
    if (ws.onmessage) {
      ws.onmessage({
        data: JSON.stringify({
          goAway: { timeLeft: 5000 },
        }),
      });
    }

    // Ska trigga hot-swap med säkerhetsmarginal (5000 - 2000 = 3000 ms)
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

    // Verifiera clamping mellan -1 och 1
    const clampedMax = bridge.clampSample(1.5);
    const clampedMin = bridge.clampSample(-1.5);
    const clampedMid = bridge.clampSample(0.42);

    expect(clampedMax).toBe(1);
    expect(clampedMin).toBe(-1);
    expect(clampedMid).toBe(0.42);

    // Verifiera adaptiv slew inom +/- 3–5 %
    const slew = bridge.getAdaptiveSlewRate();
    expect(slew).toBeGreaterThanOrEqual(0.95);
    expect(slew).toBeLessThanOrEqual(1.05);
  });
});
