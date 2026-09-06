import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TranslationBridge } from "../translationBridge";

// Mock WebSocket
class MockWebSocket {
  public static instances: MockWebSocket[] = [];
  public readyState: number = WebSocket.OPEN;
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
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose({ code: 1000 });
  });
  addEventListener = vi.fn();
}

describe("TranslationBridge Reconnect & Resilience", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("attempts reconnect with exponential backoff on unexpected socket close", () => {
    const statusChanges: string[] = [];
    const errors: string[] = [];

    const bridge = new TranslationBridge("test-key", "en", {
      onAudioData: vi.fn(),
      onStatusChange: (status) => statusChanges.push(status),
      onError: (err) => errors.push(err),
    });

    bridge.connect();

    expect(MockWebSocket.instances.length).toBe(1);
    const initialSocket = MockWebSocket.instances[0]!;

    // Simulate unexpected disconnect (code 1006 abnormal closure)
    if (initialSocket.onclose) {
      initialSocket.onclose({ code: 1006 });
    }

    // Should NOT immediately trigger fatal error status
    expect(errors.length).toBe(0);

    // Fast-forward 1 second (first retry delay)
    vi.advanceTimersByTime(1000);
    expect(MockWebSocket.instances.length).toBe(2);

    // Second socket closes unexpectedly
    const secondSocket = MockWebSocket.instances[1]!;
    if (secondSocket.onclose) {
      secondSocket.onclose({ code: 1006 });
    }

    // Fast-forward 2 seconds (second retry delay)
    vi.advanceTimersByTime(2000);
    expect(MockWebSocket.instances.length).toBe(3);

    // Third socket closes unexpectedly
    const thirdSocket = MockWebSocket.instances[2]!;
    if (thirdSocket.onclose) {
      thirdSocket.onclose({ code: 1006 });
    }

    // Fast-forward 4 seconds (third retry delay)
    vi.advanceTimersByTime(4000);
    expect(MockWebSocket.instances.length).toBe(4);

    // Fourth socket closes unexpectedly - max retries reached!
    const fourthSocket = MockWebSocket.instances[3]!;
    if (fourthSocket.onclose) {
      fourthSocket.onclose({ code: 1006 });
    }

    // Now error should be reported
    expect(errors.length).toBeGreaterThan(0);
    expect(statusChanges).toContain("error");
  });

  it("does not attempt reconnect on intentional disconnect", () => {
    const bridge = new TranslationBridge("test-key", "en", {
      onAudioData: vi.fn(),
      onStatusChange: vi.fn(),
      onError: vi.fn(),
    });

    bridge.connect();

    expect(MockWebSocket.instances.length).toBe(1);
    bridge.disconnect();

    vi.advanceTimersByTime(10000);
    expect(MockWebSocket.instances.length).toBe(1);
  });
});
