/**
 * Pattern: Gemini Live API Hot Swap & Session Resumption (Transport-agnostisk)
 * 
 * Hanterar Geminis 10/15-minuters sessionsgränser och oväntade WebSocket-frånkopplingar
 * utan att vara låst till ett specifikt WebRTC-bibliotek.
 */

interface GeminiHotSwapConfig {
  apiKey: string;
  model: string;
  systemInstruction: string;
  onAudioOutput: (pcm24kBase64: string) => void;
}

export class GeminiHotSwapSession {
  private ws: WebSocket | null = null;
  private sessionHandle: string | null = null;
  private isReconnecting = false;
  private config: GeminiHotSwapConfig;

  constructor(config: GeminiHotSwapConfig) {
    this.config = config;
  }

  public async connect(): Promise<void> {
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.config.apiKey}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.sendSetupPayload();
    };

    this.ws.onmessage = (event) => {
      this.handleServerMessage(JSON.parse(event.data));
    };

    this.ws.onclose = () => {
      if (!this.isReconnecting) {
        this.triggerHotSwap();
      }
    };
  }

  private sendSetupPayload(): void {
    const setupMessage = {
      setup: {
        model: `models/${this.config.model}`,
        responseModalities: ['AUDIO'],
        systemInstruction: {
          parts: [{ text: this.config.systemInstruction }],
        },
        // Gör att sessionen inte stängs när kontextfönstret fylls
        contextWindowCompression: {
          slidingWindow: {},
        },
        // Återuppta tidigare session om vi har ett aktivt handtag
        sessionResumption: {
          handle: this.sessionHandle ?? undefined,
        },
      },
    };

    this.ws?.send(JSON.stringify(setupMessage));
  }

  private handleServerMessage(message: any): void {
    // 1. Spara nytt resumption-handtag från Gemini
    if (message.sessionResumptionUpdate?.resumable && message.sessionResumptionUpdate?.newHandle) {
      this.sessionHandle = message.sessionResumptionUpdate.newHandle;
    }

    // 2. Lyssna på GoAway-signal från servern (schemalagd frånkoppling)
    if (message.goAway) {
      const timeLeftMs = message.goAway.timeLeft;
      // Proaktiv återanslutning innan servern dödar kopplingen
      setTimeout(() => this.triggerHotSwap(), Math.max(0, timeLeftMs - 2000));
    }

    // 3. Vid inkommande ljud från Gemini
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.config.onAudioOutput(part.inlineData.data);
        }
      }
    }
  }

  public sendAudioChunk(pcm16kBase64: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: 'audio/pcm;rate=16000',
            data: pcm16kBase64,
          }],
        },
      }));
    }
  }

  private async triggerHotSwap(): Promise<void> {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }

    // Koppla upp igen med det sparade sessionHandle
    await this.connect();
    this.isReconnecting = false;
  }
}