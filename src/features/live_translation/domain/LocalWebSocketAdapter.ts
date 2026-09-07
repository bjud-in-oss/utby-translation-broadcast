import type { AudioTransportAdapter, AudioTransportStatus } from "./types";

function getDefaultWebSocketUrl(): string {
  if (typeof window !== "undefined" && window.location) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host || "localhost:3000";
    return `${protocol}//${host}/api/ws/audio`;
  }
  return "ws://localhost:3000/api/ws/audio";
}

export class LocalWebSocketAdapter implements AudioTransportAdapter {
  private serverUrl: string;
  private status: AudioTransportStatus = "disconnected";
  private statusListeners: Array<(status: AudioTransportStatus) => void> = [];
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private remoteStream: MediaStream | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private micWorkletNode: AudioWorkletNode | null = null;
  private processorWorkletNode: AudioWorkletNode | null = null;
  private publishedTrack: string | null = null;
  private readonly MAX_BUFFERED_BYTES = 128 * 1024; // 128 KB backpressure limit

  constructor(serverUrl?: string, audioCtx?: AudioContext) {
    this.serverUrl = serverUrl || getDefaultWebSocketUrl();
    if (audioCtx) {
      this.audioCtx = audioCtx;
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: 16000 });
    }
    return this.audioCtx;
  }

  public getStatus(): AudioTransportStatus {
    return this.status;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public getPublishedTrack(): string | null {
    return this.publishedTrack;
  }

  public onStatusChange(callback: (status: AudioTransportStatus) => void): void {
    this.statusListeners.push(callback);
  }

  private setStatus(newStatus: AudioTransportStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      for (const listener of this.statusListeners) {
        listener(newStatus);
      }
    }
  }

  public connect(): Promise<void> {
    return new Promise((resolve) => {
      try {
        this.setStatus("connecting");
        const socket = new WebSocket(this.serverUrl);
        socket.binaryType = "arraybuffer"; // Zero-GC Binary Transport
        this.ws = socket;

        socket.onopen = () => {
          this.setStatus("connected");
          resolve();
        };

        socket.onmessage = (event: { data: ArrayBuffer | string }) => {
          this.handleIncomingMessage(event);
        };

        socket.onerror = (error) => {
          console.error("[LocalWS] WebSocket-fel:", error);
          this.setStatus("error");
          resolve();
        };

        socket.onclose = () => {
          if (this.status !== "disconnected") {
            this.setStatus("disconnected");
          }
        };
      } catch (err) {
        console.error("[LocalWS] Kunde inte ansluta:", err);
        this.setStatus("error");
        resolve();
      }
    });
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.micWorkletNode) {
      try {
        this.micWorkletNode.disconnect();
      } catch {}
      this.micWorkletNode = null;
    }

    if (this.processorWorkletNode) {
      try {
        this.processorWorkletNode.disconnect();
      } catch {}
      this.processorWorkletNode = null;
    }

    this.destinationNode = null;
    this.remoteStream = null;
    this.publishedTrack = null;
    this.setStatus("disconnected");
  }

  public async publishAudio(track: MediaStreamTrack): Promise<string | null> {
    if (!this.ws || this.status !== "connected") {
      return null;
    }

    try {
      const ctx = this.getAudioContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      if (ctx.audioWorklet?.addModule) {
        try {
          await ctx.audioWorklet.addModule("/src/features/live_translation/workers/MicCapture.worklet.ts");
        } catch {
          // Icke-blockerande fallback
        }
      }

      const stream = new MediaStream([track]);
      const sourceNode = ctx.createMediaStreamSource(stream);
      this.sourceNode = sourceNode;

      if (typeof AudioWorkletNode !== "undefined") {
        const workletNode = new AudioWorkletNode(ctx, "mic-capture-processor");
        this.micWorkletNode = workletNode;

        workletNode.port.onmessage = (event: { data: ArrayBuffer }) => {
          this.sendAudioFrame(event.data);
        };

        sourceNode.connect(workletNode);
      }

      this.publishedTrack = track.id;
      return track.id;
    } catch (err) {
      console.error("[LocalWS] Fel vid publicering:", err);
      return null;
    }
  }

  public sendAudioFrame(data: ArrayBuffer | Int16Array): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    // Backpressure check (>128 KB)
    if (this.ws.bufferedAmount > this.MAX_BUFFERED_BYTES) {
      console.warn("[LocalWS] Backpressure överskriden (>128KB), kasserar ljudram");
      return false;
    }

    const bufferToSend = data instanceof ArrayBuffer ? data : data.buffer;
    this.ws.send(bufferToSend);
    return true;
  }

  public async subscribeToTrack(remoteSessionId: string, trackName: string): Promise<void> {
    const ctx = this.getAudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    if (ctx.audioWorklet?.addModule) {
      try {
        await ctx.audioWorklet.addModule("/src/features/live_translation/workers/AudioProcessor.worklet.ts");
      } catch {
        // Icke-blockerande fallback
      }
    }

    if (!this.destinationNode && ctx.createMediaStreamDestination) {
      this.destinationNode = ctx.createMediaStreamDestination();
      this.remoteStream = this.destinationNode.stream;
    }

    const BUFFER_SIZE = 65536; // 2^16 samples
    const sabAudio =
      typeof SharedArrayBuffer !== "undefined"
        ? new SharedArrayBuffer(BUFFER_SIZE * 4)
        : new ArrayBuffer(BUFFER_SIZE * 4);
    const sabPointers =
      typeof SharedArrayBuffer !== "undefined"
        ? new SharedArrayBuffer(8)
        : new ArrayBuffer(8);

    if (typeof AudioWorkletNode !== "undefined") {
      const processorNode = new AudioWorkletNode(ctx, "audio-processor");
      this.processorWorkletNode = processorNode;

      processorNode.port.postMessage({
        type: "INIT",
        payload: { sabAudio, sabPointers, size: BUFFER_SIZE },
      });

      if (this.destinationNode) {
        processorNode.connect(this.destinationNode);
      }
      if (ctx.destination) {
        try {
          processorNode.connect(ctx.destination);
        } catch {}
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "subscribe",
          remoteSessionId,
          trackName,
        })
      );
    }
  }

  private handleIncomingMessage(event: { data: ArrayBuffer | string }): void {
    if (typeof event.data === "string") {
      return;
    }

    if (event.data instanceof ArrayBuffer && this.processorWorkletNode) {
      this.processorWorkletNode.port.postMessage({
        type: "PCM_DATA",
        payload: event.data,
      });
    }
  }
}
