import { AudioResampler } from "./audioResampler";
import { HotSwapManager } from "./hotSwapManager";
import { SupportedLanguage } from "./types";
import { AudioProcessor } from "../workers/AudioProcessor.worklet";
import {
  calculateRegressionModel,
  SAFE_MODE_MODEL,
  PredictionModel,
  DataPoint,
} from "./adaptiveLogic";

export interface BridgeCallbacks {
  onAudioData: (samples: Int16Array) => void;
  onStatusChange: (status: "idle" | "connecting" | "active" | "rotating" | "error") => void;
  onError: (error: string) => void;
}

export class TranslationBridge {
  private ws: WebSocket | null = null;
  private nextWs: WebSocket | null = null;
  private hotSwapManager: HotSwapManager;
  private readonly MAX_BUFFERED_BYTES = 128 * 1024; // 128 KB backpressure
  private readonly FRAME_SAMPLES_100MS = 1600; // 100 ms vid 16 kHz (10 Hz)
  private sampleBuffer: number[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private goAwayTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalDisconnect = false;
  private sfuAudioContext: AudioContext | null = null;
  private adaptiveModel: PredictionModel = SAFE_MODE_MODEL;
  private latencyHistory: DataPoint[] = [];
  private currentSlewRate = 1.0; // 0.95 till 1.05 (+/- 3-5 %)
  public processorRef: AudioProcessor | null = null;

  constructor(
    private readonly apiKey: string,
    private targetLanguage: SupportedLanguage,
    private readonly callbacks: BridgeCallbacks
  ) {
    this.hotSwapManager = new HotSwapManager((handle) => this.executeHotSwap(handle));
  }

  public clampSample(sample: number): number {
    return Math.max(-1, Math.min(1, sample));
  }

  public getAdaptiveSlewRate(): number {
    return this.currentSlewRate;
  }

  public getResumptionHandle(): string | null {
    return this.hotSwapManager.getResumptionHandle();
  }

  public connect(isRetry = false): void {
    this.isIntentionalDisconnect = false;
    if (!isRetry) this.reconnectAttempts = 0;
    this.callbacks.onStatusChange("connecting");
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(this.apiKey)}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupSocketHandlers(this.ws, false);
    } catch (err) {
      this.handleConnectionFailure(err instanceof Error ? err.message : "WebSocket-fel");
    }
  }

  private handleConnectionFailure(errorMsg: string): void {
    if (!this.isIntentionalDisconnect && this.reconnectAttempts < 3) {
      const delay = Math.min(4000, 1000 * Math.pow(2, this.reconnectAttempts++));
      this.callbacks.onStatusChange("connecting");
      this.reconnectTimer = setTimeout(() => {
        if (!this.isIntentionalDisconnect) this.connect(true);
      }, delay);
    } else {
      this.callbacks.onError(errorMsg);
      this.callbacks.onStatusChange("error");
    }
  }

  private setupSocketHandlers(socket: WebSocket, isPrewarmed: boolean): void {
    socket.onopen = () => {
      const handle = this.hotSwapManager.getResumptionHandle();
      socket.send(JSON.stringify({
        setup: {
          model: "models/gemini-3.5-live-translate-preview",
          generationConfig: {
            responseModalities: ["AUDIO"],
            translationConfig: { targetLanguageCode: this.targetLanguage, echoTargetLanguage: false },
          },
          contextWindowCompressionConfig: { slidingWindow: {} },
          ...(handle ? { sessionResumption: { handle } } : {}),
        },
      }));
      if (!isPrewarmed) {
        this.callbacks.onStatusChange("active");
        this.hotSwapManager.armTimer();
      }
    };

    socket.onmessage = (event: { data: string }) => {
      try {
        if (!event.data) return;
        const data = JSON.parse(event.data);
        if (data?.sessionResumptionUpdate?.newHandle) {
          this.hotSwapManager.updateResumptionHandle(String(data.sessionResumptionUpdate.newHandle));
        }
        if (data?.goAway) {
          const timeLeft = Number(data.goAway.timeLeft ?? 5000);
          if (this.goAwayTimer) clearTimeout(this.goAwayTimer);
          this.goAwayTimer = setTimeout(() => {
            this.executeHotSwap(this.hotSwapManager.getResumptionHandle());
          }, Math.max(0, timeLeft - 2000));
        }
        const parts = data?.serverContent?.modelTurn?.parts;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (part?.inlineData?.data) {
              const samples = AudioResampler.base64ToInt16(part.inlineData.data);
              this.updateAdaptiveSlew(samples.length);
              this.callbacks.onAudioData(samples);
            }
          }
        }
      } catch (e) {
        console.warn("[TranslationBridge] Meddelandefel:", e);
      }
    };

    socket.onclose = (evt?: { code?: number }) => {
      if (!isPrewarmed) {
        this.hotSwapManager.disarmTimer();
        if (!this.isIntentionalDisconnect && evt?.code !== 1000) {
          this.handleConnectionFailure("Oväntad frånkoppling");
        } else {
          this.callbacks.onStatusChange("idle");
        }
      }
    };
  }

  private updateAdaptiveSlew(chunkSize: number): void {
    this.latencyHistory.push({ inputDuration: 100, responseDuration: chunkSize / 24 });
    if (this.latencyHistory.length > 20) this.latencyHistory.shift();
    this.adaptiveModel = calculateRegressionModel(this.latencyHistory);
    this.currentSlewRate = Math.max(0.95, Math.min(1.05, 1.0 + (this.adaptiveModel.expansionRate - 1.2) * 0.05));
  }

  public enqueueAudioSamples(samples: Int16Array): void {
    for (let i = 0; i < samples.length; i++) this.sampleBuffer.push(samples[i]!);
    while (this.sampleBuffer.length >= this.FRAME_SAMPLES_100MS) {
      const chunk = new Int16Array(this.sampleBuffer.splice(0, this.FRAME_SAMPLES_100MS));
      this.sendAudioChunk(chunk);
    }
  }

  public sendAudioChunk(pcm16Samples: Int16Array): void {
    if (!this.ws || this.ws.readyState !== 1) return;
    if (this.ws.bufferedAmount > this.MAX_BUFFERED_BYTES) {
      console.warn("[TranslationBridge] Backpressure: 128KB överskriden, kasserar ram");
      return;
    }
    const clamped = new Int16Array(pcm16Samples.length);
    for (let i = 0; i < pcm16Samples.length; i++) {
      const norm = pcm16Samples[i]! / 0x7fff;
      const c = this.clampSample(norm);
      clamped[i] = c < 0 ? c * 0x8000 : c * 0x7fff;
    }
    const base64Data = AudioResampler.int16ToBase64(clamped);
    this.ws.send(JSON.stringify({
      realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: base64Data }] },
    }));
  }

  public attachSFUStream(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.sfuAudioContext = new AudioCtx({ sampleRate: 48000 });
      const src = this.sfuAudioContext.createMediaStreamSource(stream);
      const proc = this.sfuAudioContext.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = (e) => {
        const pcm16 = AudioResampler.downsample48kTo16k(e.inputBuffer.getChannelData(0));
        this.enqueueAudioSamples(pcm16);
      };
      src.connect(proc);
      proc.connect(this.sfuAudioContext.destination);
    } catch (err) {
      console.warn("[TranslationBridge] Kunde inte koppla SFU-ström:", err);
    }
  }

  private executeHotSwap(_handle: string | null): void {
    this.callbacks.onStatusChange("rotating");
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(this.apiKey)}`;
    try {
      this.nextWs = new WebSocket(wsUrl);
      this.setupSocketHandlers(this.nextWs, true);
      this.nextWs.addEventListener("open", () => {
        const oldWs = this.ws;
        this.ws = this.nextWs;
        this.nextWs = null;
        if (oldWs) oldWs.close();
        this.callbacks.onStatusChange("active");
        this.hotSwapManager.armTimer();
      }, { once: true });
    } catch (err) {
      console.warn("[TranslationBridge] Hot Swap misslyckades:", err);
      this.callbacks.onStatusChange("active");
    }
  }

  public setLanguage(lang: SupportedLanguage): void {
    this.targetLanguage = lang;
  }

  public disconnect(): void {
    this.isIntentionalDisconnect = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.goAwayTimer) clearTimeout(this.goAwayTimer);
    if (this.sfuAudioContext && this.sfuAudioContext.state !== "closed") {
      void this.sfuAudioContext.close();
      this.sfuAudioContext = null;
    }
    this.hotSwapManager.reset();
    if (this.ws) { this.ws.close(); this.ws = null; }
    if (this.nextWs) { this.nextWs.close(); this.nextWs = null; }
    this.sampleBuffer = [];
    this.latencyHistory = [];
    this.processorRef = null;
    this.callbacks.onStatusChange("idle");
  }

  public dispose(): void {
    this.disconnect();
  }

  public destroy(): void {
    this.disconnect();
  }
}
