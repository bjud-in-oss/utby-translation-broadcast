import { AudioResampler } from "./audioResampler";
import { HotSwapManager } from "./hotSwapManager";
import { SupportedLanguage } from "./types";

export interface BridgeCallbacks {
  onAudioData: (samples: Int16Array) => void;
  onStatusChange: (status: "idle" | "connecting" | "active" | "rotating" | "error") => void;
  onError: (error: string) => void;
}

/**
 * TranslationBridge
 * Huvudorkestrering av WebSocket-anslutning mot Gemini Live Translate API
 * med payload-isolering, frame pacing och proaktiv hot-swap.
 */
export class TranslationBridge {
  private ws: WebSocket | null = null;
  private nextWs: WebSocket | null = null;
  private hotSwapManager: HotSwapManager;
  private readonly MAX_BUFFERED_BYTES = 128 * 1024; // 128 KB backpressure-tröskel
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalDisconnect = false;

  constructor(
    private readonly apiKey: string,
    private targetLanguage: SupportedLanguage,
    private readonly callbacks: BridgeCallbacks
  ) {
    this.hotSwapManager = new HotSwapManager((handle) => {
      this.executeHotSwap(handle);
    });
  }

  public connect(isRetry = false): void {
    this.isIntentionalDisconnect = false;
    if (!isRetry) {
      this.reconnectAttempts = 0;
    }
    this.callbacks.onStatusChange("connecting");
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(
      this.apiKey
    )}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupSocketHandlers(this.ws, false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kunde inte upprätta WebSocket";
      this.handleConnectionFailure(msg);
    }
  }

  private handleConnectionFailure(errorMsg: string): void {
    if (!this.isIntentionalDisconnect && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.attemptReconnect();
    } else {
      this.callbacks.onError(errorMsg);
      this.callbacks.onStatusChange("error");
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(4000, 1000 * Math.pow(2, this.reconnectAttempts));
      this.reconnectAttempts++;
      this.callbacks.onStatusChange("connecting");
      this.reconnectTimer = setTimeout(() => {
        if (!this.isIntentionalDisconnect) {
          this.connect(true);
        }
      }, delay);
    } else {
      this.callbacks.onError("Anslutningen till Gemini förlorades efter flera återanslutningsförsök.");
      this.callbacks.onStatusChange("error");
    }
  }

  private setupSocketHandlers(socket: WebSocket, isPrewarmed: boolean): void {
    socket.onopen = () => {
      const handle = this.hotSwapManager.getResumptionHandle();
      const setupPayload: Record<string, unknown> = {
        setup: {
          model: "models/gemini-3.5-live-translate-preview",
          generationConfig: {
            responseModalities: ["AUDIO"],
            translationConfig: {
              targetLanguageCode: this.targetLanguage,
              echoTargetLanguage: false,
            },
          },
          ...(handle ? { sessionResumption: { handle } } : {}),
        },
      };

      socket.send(JSON.stringify(setupPayload));
      if (!isPrewarmed) {
        this.callbacks.onStatusChange("active");
        this.hotSwapManager.armTimer();
      }
    };

    socket.onmessage = (event: MessageEvent) => {
      try {
        const rawData = typeof event.data === "string" ? event.data : "";
        if (!rawData) return;

        const data = JSON.parse(rawData);

        // Kontrollera om sessionResumptionUpdate anlänt
        if (data?.sessionResumptionUpdate?.newHandle) {
          this.hotSwapManager.updateResumptionHandle(
            String(data.sessionResumptionUpdate.newHandle)
          );
        }

        // Extrahera ljuddelar
        const parts = data?.serverContent?.modelTurn?.parts;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (part?.inlineData?.data) {
              const samples = AudioResampler.base64ToInt16(part.inlineData.data);
              this.callbacks.onAudioData(samples);
            }
          }
        }
      } catch (e) {
        console.warn("Kunde inte tolka Gemini-meddelande:", e);
      }
    };

    socket.onerror = (evt) => {
      console.warn("WebSocket fel:", evt);
      // Hanteras via onclose eller om anslutningen misslyckas direkt
    };

    socket.onclose = (evt?: { code?: number }) => {
      if (!isPrewarmed) {
        this.hotSwapManager.disarmTimer();
        if (!this.isIntentionalDisconnect && evt?.code !== 1000) {
          this.attemptReconnect();
        } else {
          this.callbacks.onStatusChange("idle");
        }
      }
    };
  }

  public sendAudioChunk(pcm16Samples: Int16Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Backpressure-kontroll
    if (this.ws.bufferedAmount > this.MAX_BUFFERED_BYTES) {
      console.warn("Backpressure: WebSocket-buffert full, ram släpps");
      return;
    }

    const base64Data = AudioResampler.int16ToBase64(pcm16Samples);
    const payload = JSON.stringify({
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: "audio/pcm;rate=16000",
            data: base64Data,
          },
        ],
      },
    });

    this.ws.send(payload);
  }

  private executeHotSwap(_handle: string | null): void {
    this.callbacks.onStatusChange("rotating");
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(
      this.apiKey
    )}`;

    try {
      this.nextWs = new WebSocket(wsUrl);
      this.setupSocketHandlers(this.nextWs, true);

      // När nästa socket är redo, byt atomärt
      this.nextWs.addEventListener(
        "open",
        () => {
          const oldWs = this.ws;
          this.ws = this.nextWs;
          this.nextWs = null;
          if (oldWs) oldWs.close();
          this.callbacks.onStatusChange("active");
          this.hotSwapManager.armTimer();
        },
        { once: true }
      );
    } catch (err) {
      console.warn("Hot-swap misslyckades, fortsätter med befintlig socket:", err);
      this.callbacks.onStatusChange("active");
    }
  }

  public setLanguage(lang: SupportedLanguage): void {
    this.targetLanguage = lang;
  }

  public disconnect(): void {
    this.isIntentionalDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.hotSwapManager.reset();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.nextWs) {
      this.nextWs.close();
      this.nextWs = null;
    }
    this.callbacks.onStatusChange("idle");
  }
}
