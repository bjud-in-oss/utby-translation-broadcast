import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CloudflareSFUAdapter } from "../CloudflareSFUAdapter";
import type { AudioTransportAdapter, AudioTransportStatus } from "../types";

class MockRTCPeerConnection {
  iceGatheringState = "complete";
  signalingState = "stable";
  iceConnectionState = "connected";
  localDescription = { type: "offer", sdp: "v=0\r\no=mock-offer" };
  remoteDescription: RTCSessionDescriptionInit | null = null;
  ontrack: ((ev: { track: MediaStreamTrack; streams: MediaStream[] }) => void) | null = null;

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  getTransceivers = vi.fn().mockReturnValue([]);
  addTransceiver = vi.fn().mockReturnValue({ mid: "0" });
  createOffer = vi.fn().mockResolvedValue({ type: "offer", sdp: "v=0\r\no=mock-offer" });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockImplementation((desc: RTCSessionDescriptionInit) => {
    this.remoteDescription = desc;
    return Promise.resolve();
  });
  close = vi.fn().mockImplementation(() => {
    this.signalingState = "closed";
  });
}

class MockWebSocket {
  url: string;
  readyState = 0;
  binaryType = "arraybuffer";
  bufferedAmount = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: unknown) => void) | null = null;
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

describe("AudioTransportAdapter Contract & CloudflareSFUAdapter", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let adapter: AudioTransportAdapter;

  beforeEach(() => {
    (window as unknown as { RTCPeerConnection: unknown }).RTCPeerConnection = MockRTCPeerConnection;
    (window as unknown as { RTCSessionDescription: unknown }).RTCSessionDescription = vi
      .fn()
      .mockImplementation((desc: unknown) => desc);
    (window as unknown as { WebSocket: unknown }).WebSocket = MockWebSocket;

    mockFetch = vi.fn();
    window.fetch = mockFetch;
    adapter = new CloudflareSFUAdapter("room-contract-1");
  });

  afterEach(() => {
    adapter.disconnect();
    vi.restoreAllMocks();
  });

  it("initieras med 'disconnected' status och null som fjärrström", () => {
    expect(adapter.getStatus()).toBe("disconnected");
    expect(adapter.getRemoteStream()).toBeNull();
  });

  it("anropar onStatusChange vid tillståndsövergångar", async () => {
    const statusChanges: AudioTransportStatus[] = [];
    adapter.onStatusChange((status) => statusChanges.push(status));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        sessionId: "session-abc-123",
        sessionDescription: { type: "answer", sdp: "v=0\r\no=mock-answer" },
      }),
    });

    await adapter.connect();

    expect(statusChanges).toContain("connecting");
    expect(statusChanges).toContain("connected");
    expect(adapter.getStatus()).toBe("connected");
  });

  it("publicerar ljudspår och returnerar sessions-ID", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessionId: "session-pub-999",
          sessionDescription: { type: "answer", sdp: "v=0\r\no=session-answer" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessionDescription: { type: "answer", sdp: "v=0\r\no=track-answer" },
          tracks: [{ trackName: "track-sv-1" }],
        }),
      });

    await adapter.connect();

    const mockTrack = { id: "track-sv-1", kind: "audio" } as MediaStreamTrack;
    const publishedId = await adapter.publishAudio(mockTrack);

    expect(publishedId).toBe("session-pub-999");
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0]).toBe("/api/sfu/tracks/new");
  });

  it("prenumererar på namngivet tolkspår", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessionId: "session-sub-111",
          sessionDescription: { type: "answer", sdp: "v=0\r\no=sub-answer" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessionDescription: { type: "answer", sdp: "v=0\r\no=track-answer" },
          tracks: [{ trackName: "audio-es" }],
        }),
      });

    await adapter.connect();
    await adapter.subscribeToTrack("remote-speaker-888", "audio-es");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const trackPayload = JSON.parse(mockFetch.mock.calls[1][1].body as string);
    expect(trackPayload.tracks[0]).toEqual({
      location: "remote",
      sessionId: "remote-speaker-888",
      trackName: "audio-es",
    });
  });

  it("kopplar ner och nollställer status och fjärrström vid disconnect()", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        sessionId: "session-disc-333",
        sessionDescription: { type: "answer", sdp: "v=0\r\no=disc-answer" },
      }),
    });

    await adapter.connect();
    expect(adapter.getStatus()).toBe("connected");

    adapter.disconnect();
    expect(adapter.getStatus()).toBe("disconnected");
    expect(adapter.getRemoteStream()).toBeNull();
  });

  it("sätter status till 'error' vid anslutningsfel", async () => {
    const statuses: AudioTransportStatus[] = [];
    adapter.onStatusChange((s) => statuses.push(s));

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal Server Error" }),
    });

    await adapter.connect();
    expect(adapter.getStatus()).toBe("error");
    expect(statuses).toContain("error");
  });
});
