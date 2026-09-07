import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LocalWebSocketAdapter } from "../LocalWebSocketAdapter";
import type { AudioTransportAdapter, AudioTransportStatus } from "../types";

class MockWebSocket {
  url: string;
  readyState = 0; // 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
  binaryType = "blob";
  bufferedAmount = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer | string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  send = vi.fn();
  close = vi.fn().mockImplementation(() => {
    this.readyState = 3;
    this.onclose?.();
  });

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    }, 10);
  }
}

class MockAudioWorklet {
  addModule = vi.fn().mockResolvedValue(undefined);
}

class MockAudioWorkletNode {
  port = {
    postMessage: vi.fn(),
    onmessage: null as ((event: { data: unknown }) => void) | null,
  };
  connect = vi.fn();
  disconnect = vi.fn();
  constructor(_ctx: unknown, _name: string) {}
}

class MockMediaStreamAudioSourceNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockMediaStreamAudioDestinationNode {
  stream = {
    id: "mock-remote-stream",
    getTracks: () => [{ id: "remote-audio-track", kind: "audio" }],
  } as unknown as MediaStream;
}

class MockAudioContext {
  state = "running";
  sampleRate = 16000;
  audioWorklet = new MockAudioWorklet();
  destination = {};

  createMediaStreamSource = vi.fn().mockReturnValue(new MockMediaStreamAudioSourceNode());
  createMediaStreamDestination = vi.fn().mockReturnValue(new MockMediaStreamAudioDestinationNode());
  createScriptProcessor = vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null,
  });
  createBuffer = vi.fn().mockReturnValue({
    getChannelData: () => new Float32Array(1600),
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

describe("LocalWebSocketAdapter Specifications", () => {
  let mockAudioCtx: MockAudioContext;
  let adapter: AudioTransportAdapter;
  let originalLocation: Location;

  beforeEach(() => {
    (window as unknown as { WebSocket: unknown }).WebSocket = MockWebSocket;
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
    (window as unknown as { AudioWorkletNode: unknown }).AudioWorkletNode = MockAudioWorkletNode;

    mockAudioCtx = new MockAudioContext();
    originalLocation = window.location;
    // Set default https location
    delete (window as unknown as { location: unknown }).location;
    (window as unknown as { location: unknown }).location = {
      protocol: "https:",
      host: "church-stream.local:3000",
    } as Location;

    adapter = new LocalWebSocketAdapter(undefined, mockAudioCtx as unknown as AudioContext);
  });

  afterEach(() => {
    adapter.disconnect();
    (window as unknown as { location: unknown }).location = originalLocation;
    vi.restoreAllMocks();
  });

  it("initieras med 'disconnected' status och null som fjärrström", () => {
    expect(adapter.getStatus()).toBe("disconnected");
    expect(adapter.getRemoteStream()).toBeNull();
  });

  it("använder Dynamic Protocol Switch: wss vid HTTPS och ws vid HTTP", () => {
    const defaultHttpsAdapter = new LocalWebSocketAdapter();
    expect((defaultHttpsAdapter as unknown as { serverUrl: string }).serverUrl).toBe(
      "wss://church-stream.local:3000/api/ws/audio"
    );

    (window as unknown as { location: unknown }).location = {
      protocol: "http:",
      host: "192.168.1.100:8080",
    } as Location;

    const httpAdapter = new LocalWebSocketAdapter();
    expect((httpAdapter as unknown as { serverUrl: string }).serverUrl).toBe(
      "ws://192.168.1.100:8080/api/ws/audio"
    );

    const customAdapter = new LocalWebSocketAdapter("ws://custom-server:9000/stream");
    expect((customAdapter as unknown as { serverUrl: string }).serverUrl).toBe(
      "ws://custom-server:9000/stream"
    );
  });

  it("ansluter med binaryType = 'arraybuffer' och ändrar status till connected", async () => {
    const statuses: AudioTransportStatus[] = [];
    adapter.onStatusChange((s) => statuses.push(s));

    const connectPromise = adapter.connect();
    expect(adapter.getStatus()).toBe("connecting");

    await connectPromise;
    expect(adapter.getStatus()).toBe("connected");
    expect(statuses).toContain("connecting");
    expect(statuses).toContain("connected");

    const wsInstance = (adapter as unknown as { ws: MockWebSocket }).ws;
    expect(wsInstance.binaryType).toBe("arraybuffer");
  });

  it("sätter status till 'error' om WebSocket kastar fel", async () => {
    const statuses: AudioTransportStatus[] = [];
    adapter.onStatusChange((s) => statuses.push(s));

    // Skapa en WebSocket som felar
    class ErrorWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url);
        setTimeout(() => {
          this.onerror?.(new Error("Network unreach"));
        }, 5);
      }
    }
    (window as unknown as { WebSocket: unknown }).WebSocket = ErrorWebSocket;

    const failingAdapter = new LocalWebSocketAdapter();
    failingAdapter.onStatusChange((s) => statuses.push(s));
    await failingAdapter.connect();

    expect(failingAdapter.getStatus()).toBe("error");
    expect(statuses).toContain("error");
  });

  it("publicerar ljudspår (publishAudio) och kopplar till MicCapture.worklet", async () => {
    await adapter.connect();

    const mockTrack = {
      id: "mic-track-1",
      kind: "audio",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaStreamTrack;

    const publishedId = await adapter.publishAudio(mockTrack);
    expect(publishedId).toBe("mic-track-1");
    expect(mockAudioCtx.audioWorklet.addModule).toHaveBeenCalled();
    expect(mockAudioCtx.createMediaStreamSource).toHaveBeenCalled();
  });

  it("droppar ljudramar vid backpressure när ws.bufferedAmount > 128 KB", async () => {
    await adapter.connect();
    const wsInstance = (adapter as unknown as { ws: MockWebSocket }).ws;

    // Simulera 130 KB i buffert (backpressure)
    wsInstance.bufferedAmount = 130 * 1024;

    const mockTrack = { id: "mic-track-bp", kind: "audio" } as MediaStreamTrack;
    await adapter.publishAudio(mockTrack);

    // Anropa intern sändningsmetod med 100ms Int16-ram (1600 samples = 3200 bytes)
    const dummyPcm = new Int16Array(1600);
    const sent = (adapter as unknown as { sendAudioFrame: (data: Int16Array) => boolean }).sendAudioFrame(dummyPcm);

    expect(sent).toBe(false); // Droppad
    expect(wsInstance.send).not.toHaveBeenCalled();

    // Normal buffert under 128 KB
    wsInstance.bufferedAmount = 10 * 1024;
    const sentOk = (adapter as unknown as { sendAudioFrame: (data: Int16Array) => boolean }).sendAudioFrame(dummyPcm);
    expect(sentOk).toBe(true);
    expect(wsInstance.send).toHaveBeenCalled();
  });

  it("prenumererar på spår (subscribeToTrack), tar emot binära PCM-paket och exponerar fjärrström", async () => {
    await adapter.connect();
    await adapter.subscribeToTrack("remote-church-host", "main-audio");

    expect(adapter.getRemoteStream()).not.toBeNull();
    expect(mockAudioCtx.createMediaStreamDestination).toHaveBeenCalled();

    const wsInstance = (adapter as unknown as { ws: MockWebSocket }).ws;
    expect(wsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "subscribe",
        remoteSessionId: "remote-church-host",
        trackName: "main-audio",
      })
    );

    // Simulera inkommande binärt PCM-paket (ArrayBuffer)
    const incomingPcm = new Int16Array(1600).fill(1234);
    expect(() => {
      wsInstance.onmessage?.({ data: incomingPcm.buffer });
    }).not.toThrow();
  });

  it("stänger WebSocket, audio-noder och nollställer resurser vid disconnect()", async () => {
    await adapter.connect();
    await adapter.subscribeToTrack("host-1", "audio-1");

    expect(adapter.getStatus()).toBe("connected");
    expect(adapter.getRemoteStream()).not.toBeNull();

    adapter.disconnect();

    expect(adapter.getStatus()).toBe("disconnected");
    expect(adapter.getRemoteStream()).toBeNull();
  });
});
