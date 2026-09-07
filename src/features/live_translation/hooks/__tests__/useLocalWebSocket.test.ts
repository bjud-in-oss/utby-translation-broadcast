import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalWebSocket } from "../useLocalWebSocket";
import { LocalWebSocketAdapter } from "../../domain/LocalWebSocketAdapter";

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
  close = vi.fn().mockImplementation(() => {
    this.readyState = 3;
    this.onclose?.();
  });

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    }, 5);
  }
}

class MockAudioContext {
  state = "running";
  sampleRate = 16000;
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  destination = {};
  createMediaStreamSource = vi.fn().mockReturnValue({ connect: vi.fn(), disconnect: vi.fn() });
  createMediaStreamDestination = vi.fn().mockReturnValue({
    stream: { id: "remote-stream", getTracks: () => [{ id: "remote-track" }] }
  });
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockImplementation(() => {
    this.state = "closed";
    return Promise.resolve();
  });
}

describe("useLocalWebSocket Hook", () => {
  beforeEach(() => {
    (window as unknown as { WebSocket: unknown }).WebSocket = MockWebSocket;
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initieras med 'disconnected' status och null som remoteStream", () => {
    const { result } = renderHook(() => useLocalWebSocket());
    expect(result.current.status).toBe("disconnected");
    expect(result.current.remoteStream).toBeNull();
    expect(result.current.adapter).toBeInstanceOf(LocalWebSocketAdapter);
  });

  it("ansluter adaptern och uppdaterar status och remoteStream vid connect", async () => {
    const { result } = renderHook(() => useLocalWebSocket("ws://test:8080"));
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.status).toBe("connected");
  });

  it("kopplar ner vid disconnect() och nollställer tillstånd", async () => {
    const { result } = renderHook(() => useLocalWebSocket());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.status).toBe("connected");

    act(() => {
      result.current.disconnect();
    });
    expect(result.current.status).toBe("disconnected");
    expect(result.current.remoteStream).toBeNull();
  });

  it("delegerar publishAudio och subscribeToTrack till underliggande adapter", async () => {
    const { result } = renderHook(() => useLocalWebSocket());
    await act(async () => {
      await result.current.connect();
    });

    const mockTrack = { id: "track-local-1", kind: "audio" } as unknown as MediaStreamTrack;
    let publishedId: string | null = null;
    await act(async () => {
      publishedId = await result.current.publishAudio(mockTrack);
    });
    expect(publishedId).toBe("track-local-1");

    await act(async () => {
      await result.current.subscribeToTrack("remote-peer", "audio-track");
    });
    expect(result.current.remoteStream).not.toBeNull();
  });

  it("kopplar automatiskt ner adaptern vid unmount", async () => {
    const { result, unmount } = renderHook(() => useLocalWebSocket());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.status).toBe("connected");

    const disconnectSpy = vi.spyOn(result.current.adapter, "disconnect");
    unmount();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
