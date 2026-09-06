import {
  Room,
  LocalAudioTrack,
  AudioSource,
  AudioFrame,
  TrackPublishOptions,
  TrackSource,
} from "@livekit/rtc-node";
import WebSocket from "ws";

export interface ResilientBridgeConfig {
  sessionId: string;
  targetLanguage: string;
  geminiApiKey: string;
  geminiModel?: string; // Standard: gemini-3.5-live-translate-preview
  livekitUrl: string;
  livekitToken: string;
}

/**
 * ResilientGeminiLiveBridge
 *
 * Implementerar de fyra kritiska produktionsmönstren:
 * 1. 14-minuters proaktiv session-rotation utan att röra LiveKits AudioSource/Track.
 * 2. 20ms / 480-samples frame pacing för jämn WebRTC-uppspelning.
 * 3. Payload isolation i Gemini Setup (inga tools/systemInstruction vid translationConfig).
 * 4. Backpressure-guard via ws.bufferedAmount för att förhindra minnesläckage.
 */
export class ResilientGeminiLiveBridge {
  // LiveKit WebRTC state (Beständigt under hela sessionens livstid)
  private room: Room | null = null;
  private audioSource: AudioSource | null = null;
  private localTrack: LocalAudioTrack | null = null;

  // Gemini WebSocket state (Roterbart utan att WebRTC påverkas)
  private activeWs: WebSocket | null = null;
  private resumptionHandle: string | null = null;
  private isRotating: boolean = false;
  private rotationTimer: NodeJS.Timeout | null = null;

  // Ljud- och pacing-konfiguration
  private readonly sampleRate: number = 24000; // 24 kHz mono från Gemini
  private readonly channels: number = 1;
  private readonly samplesPerFrame: number = 480; // 24000 Hz * 0.02s = 480 samplar per 20ms frame
  private readonly pacingIntervalMs: number = 20;

  // Frame pacing jitter-kö
  private audioQueue: Int16Array[] = [];
  private pacingTimer: NodeJS.Timeout | null = null;
  private isPacingActive: boolean = false;

  // 14 minuters rotation (Gemini Live API stängs hårt vid 15 minuter)
  private readonly ROTATION_TIMEOUT_MS = 14 * 60 * 1000;
  // Tröskelvärde för socket-backpressure (128 KB)
  private readonly MAX_BUFFERED_AMOUNT = 128 * 1024;

  private isRunning: boolean = false;

  constructor(private readonly config: ResilientBridgeConfig) {}

  /**
   * Startar bryggan: Ansluter till LiveKit och Gemini samt startar pacing & rotation.
   */
  public async start(): Promise<void> {
    console.log(`[ResilientBridge] Startar för språk ${this.config.targetLanguage}...`);
    this.isRunning = true;

    // 1. Initiera LiveKit Room & skapa permanent AudioSource
    await this.initLiveKit();

    // 2. Anslut första Gemini Live WebSocket
    this.activeWs = await this.createGeminiConnection();

    // 3. Starta timer för proaktiv 14-minuters rotation
    this.armRotationTimer();

    console.log(`[ResilientBridge] Aktiv och strömmar till LiveKit rum ${this.config.sessionId}`);
  }

  /**
   * Initierar LiveKit och skapar AudioSource och LocalAudioTrack EN GÅNG.
   * Dessa förstörs ALDRIG under rotation.
   */
  private async initLiveKit(): Promise<void> {
    this.room = new Room();
    await this.room.connect(this.config.livekitUrl, this.config.livekitToken, {
      autoSubscribe: false,
      dynacast: false,
    });

    // Skapa AudioSource för 24kHz mono (matchar Gemini PCM-output)
    this.audioSource = new AudioSource(this.sampleRate, this.channels);
    this.localTrack = LocalAudioTrack.createAudioTrack(
      `translated-${this.config.targetLanguage}`,
      this.audioSource
    );

    const publishOptions = new TrackPublishOptions();
    publishOptions.source = TrackSource.SOURCE_MICROPHONE;

    await this.room.localParticipant!.publishTrack(this.localTrack, publishOptions);
    console.log(`[ResilientBridge] Permanent AudioSource & LocalAudioTrack publicerade.`);
  }

  /**
   * Produktionstrick 1: Hot-swap / Session Rotation vid Minut 14
   * 
   * Skapar en NY anslutning i bakgrunden med resumptionHandle.
   * När den nya är bekräftad via setupComplete byts referensen sömlöst.
   */
  public async rotateGeminiSession(): Promise<void> {
    if (this.isRotating || !this.isRunning) return;
    this.isRotating = true;

    console.log(
      `[ResilientBridge:Rotation] Initierar hot-swap vid minut 14 (handle: ${this.resumptionHandle || "saknas"})...`
    );

    try {
      // 1. Pre-warm: Upprätta en ny parallell WebSocket till Gemini
      const nextWs = await this.createGeminiConnection(this.resumptionHandle || undefined);

      // 2. Sömlöst byte: Byt aktiv referens utan att störa audioSource eller queue
      const oldWs = this.activeWs;
      this.activeWs = nextWs;

      // 3. Stäng den gamla anslutningen kontrollerat
      if (oldWs) {
        oldWs.removeAllListeners();
        oldWs.close();
      }

      console.log(`[ResilientBridge:Rotation] Hot-swap lyckades! LiveKit-lyssnare hör inget avbrott.`);

      // 4. Återställ rotationstimer för nästa 14 minuter
      this.armRotationTimer();
    } catch (err) {
      console.error(`[ResilientBridge:Rotation] Hot-swap misslyckades:`, err);
      // Försök igen inom 30 sekunder om vi misslyckades före minut 15
      setTimeout(() => {
        if (this.isRunning) this.rotateGeminiSession();
      }, 30_000);
    } finally {
      this.isRotating = false;
    }
  }

  /**
   * Upprättar och konfigurerar en Gemini Live WebSocket-anslutning.
   */
  private createGeminiConnection(handle?: string): Promise<WebSocket> {
    const model = this.config.geminiModel || "gemini-3.5-live-translate-preview";
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.config.geminiApiKey}`;

    return new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      let isReady = false;

      ws.on("open", () => {
        console.log(`[ResilientBridge] Gemini WebSocket öppnad. Skickar isolerad setup...`);
        this.sendIsolatedSetup(ws, model, handle);
      });

      ws.on("message", (raw: WebSocket.Data) => {
        try {
          const msg = JSON.parse(raw.toString());

          // Bekräftelse på att setup är godkänd
          if (msg.setupComplete) {
            console.log(`[ResilientBridge] Gemini setupComplete bekräftad!`);
            isReady = true;
            resolve(ws);
            return;
          }

          // Cacha resumption handle för framtida rotationer
          if (msg.sessionResumptionUpdate?.resumable && msg.sessionResumptionUpdate.newHandle) {
            this.resumptionHandle = msg.sessionResumptionUpdate.newHandle;
          }

          // Om Gemini server skickar ett proaktivt goAway innan vår timer
          if (msg.goAway) {
            console.warn(`[ResilientBridge] Gemini sände goAway. Roterar session omedelbart...`);
            this.rotateGeminiSession();
          }

          // Hantera inkommande audio chunks
          const parts = msg?.serverContent?.modelTurn?.parts;
          if (parts?.length) {
            for (const part of parts) {
              if (part.inlineData?.data) {
                this.enqueuePcmAudio(part.inlineData.data);
              }
            }
          }
        } catch (e) {
          console.error(`[ResilientBridge] Fel vid tolkning av Gemini-meddelande:`, e);
        }
      });

      ws.on("error", (err) => {
        console.error(`[ResilientBridge] Gemini WebSocket-fel:`, err);
        if (!isReady) reject(err);
      });

      ws.on("close", (code, reason) => {
        console.log(`[ResilientBridge] WebSocket stängd (${code}: ${reason.toString()})`);
        if (!isReady) {
          reject(new Error(`WebSocket stängdes före setup: ${code}`));
        } else if (ws === this.activeWs && this.isRunning && !this.isRotating) {
          console.warn(`[ResilientBridge] Oväntad socket-nedkoppling. Återansluter...`);
          this.rotateGeminiSession();
        }
      });

      // Timeout om Gemini inte svarar inom 15 sekunder
      setTimeout(() => {
        if (!isReady) {
          ws.terminate();
          reject(new Error("Timeout vid väntan på Gemini setupComplete"));
        }
      }, 15_000);
    });
  }

  /**
   * Produktionstrick 3: Payload Isolation
   * 
   * Skickar strikt ren setup-payload.
   * Förbjudet vid translationConfig:
   * - Inga tools (inga funktioner/Google Search)
   * - Inget systemInstruction (textprompter ger 1008 Policy Violation)
   * - Inaktivera VAD via automaticActivityDetection.disabled = true
   */
  private sendIsolatedSetup(ws: WebSocket, model: string, resumptionHandle?: string): void {
    const setupPayload = {
      setup: {
        model: `models/${model}`,
        outputAudioTranscription: {},
        generationConfig: {
          responseModalities: ["AUDIO"],
          translationConfig: {
            targetLanguageCode: this.config.targetLanguage,
            echoTargetLanguage: true,
          },
        },
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: true, // Förhindra att Gemini klipper av meningar i förtid
          },
        },
        sessionResumption: resumptionHandle ? { handle: resumptionHandle } : {},
      },
    };

    ws.send(JSON.stringify(setupPayload));
  }

  /**
   * Produktionstrick 4: Backpressure-hantering via bufferedAmount
   * 
   * Förhindrar minnesläckage och latensryck om nätverket mellan Node.js och Gemini sackar.
   */
  public sendAudioInput(pcm16Buffer: Buffer, sampleRate: number = 48000): void {
    if (!this.activeWs || this.activeWs.readyState !== WebSocket.OPEN) {
      return;
    }

    // Skydda minnet: Droppa frame om TCP-bufferten överstiger tröskeln
    if (this.activeWs.bufferedAmount > this.MAX_BUFFERED_AMOUNT) {
      console.warn(
        `[ResilientBridge:Backpressure] Socket överbelastad (${this.activeWs.bufferedAmount} bytes). Droppar frame för realtidsprestanda.`
      );
      return;
    }

    const message = {
      realtimeInput: {
        audio: {
          mimeType: `audio/pcm;rate=${sampleRate}`,
          data: pcm16Buffer.toString("base64"),
        },
      },
    };

    this.activeWs.send(JSON.stringify(message));
  }

  /**
   * Produktionstrick 2: Frame Pacing (480 samplar / 20ms per skrivning)
   * 
   * Lägger inkomna PCM-paket i en FIFO-ringbuffert.
   */
  private enqueuePcmAudio(base64Audio: string): void {
    const buffer = Buffer.from(base64Audio, "base64");
    const int16 = new Int16Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength / 2
    );

    this.audioQueue.push(int16);

    if (!this.isPacingActive) {
      this.startPacingLoop();
    }
  }

  /**
   * Pacing Loop: Skriver exakt 480 samplar (20ms @ 24kHz) till LiveKit AudioSource
   * var 20:e millisekund.
   */
  private startPacingLoop(): void {
    this.isPacingActive = true;
    let currentChunk: Int16Array | null = null;
    let chunkOffset = 0;

    this.pacingTimer = setInterval(async () => {
      if (!this.isRunning || !this.audioSource) {
        if (this.pacingTimer) clearInterval(this.pacingTimer);
        this.isPacingActive = false;
        return;
      }

      // Hämta nästa chunk ur kön om nuvarande är förbrukad
      if (!currentChunk || chunkOffset >= currentChunk.length) {
        if (this.audioQueue.length === 0) {
          // Kön är tom, pausa loopen för att spara CPU
          if (this.pacingTimer) clearInterval(this.pacingTimer);
          this.pacingTimer = null;
          this.isPacingActive = false;
          return;
        }
        currentChunk = this.audioQueue.shift()!;
        chunkOffset = 0;
      }

      // Plocka exakt 480 samplar (20ms)
      const available = currentChunk.length - chunkOffset;
      const take = Math.min(this.samplesPerFrame, available);
      const slice = currentChunk.subarray(chunkOffset, chunkOffset + take);
      chunkOffset += take;

      try {
        const frame = new AudioFrame(slice, this.sampleRate, this.channels, slice.length);
        await this.audioSource.captureFrame(frame);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("InvalidState") || msg.includes("closed")) {
          console.warn("[ResilientBridge:Pacing] AudioSource stängdes under skrivning.");
          this.audioSource = null;
        } else {
          console.error("[ResilientBridge:Pacing] captureFrame-fel:", err);
        }
      }
    }, this.pacingIntervalMs);
  }

  /**
   * Sätter timern för rotation vid minut 14.
   */
  private armRotationTimer(): void {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
    }
    this.rotationTimer = setTimeout(() => {
      this.rotateGeminiSession();
    }, this.ROTATION_TIMEOUT_MS);
  }

  /**
   * Avslutar och städar upp hela bryggan kontrollerat vid sessionsslut.
   */
  public async stop(): Promise<void> {
    console.log(`[ResilientBridge] Stoppar brygga...`);
    this.isRunning = false;

    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
      this.rotationTimer = null;
    }

    if (this.pacingTimer) {
      clearInterval(this.pacingTimer);
      this.pacingTimer = null;
    }
    this.isPacingActive = false;
    this.audioQueue = [];

    if (this.activeWs) {
      this.activeWs.removeAllListeners();
      this.activeWs.close();
      this.activeWs = null;
    }

    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }

    this.audioSource = null;
    this.localTrack = null;
  }
}
