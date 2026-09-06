import { AudioSource, LocalAudioTrack, Room, TrackSource } from 'livekit-client';

export class GeminiLiveKitBridge {
  private ws: WebSocket | null = null;
  private audioSource: AudioSource | null = null;
  private targetLang: string;

  constructor(targetLang: string = 'sv') {
    this.targetLang = targetLang;
  }

  public async initGeminiSession(apiKey: string, room: Room) {
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(apiKey)}`;
    this.ws = new WebSocket(wsUrl);

    // 1. Skapa LiveKit AudioSource för 24kHz Gemini-utdata
    this.audioSource = new AudioSource(24000, 1);
    const localTrack = LocalAudioTrack.createAudioTrack(`translation_${this.targetLang}`, this.audioSource);

    await room.localParticipant.publishTrack(localTrack, {
      source: TrackSource.UNKNOWN,
    });

    this.ws.onopen = () => {
      // Skicka KORREKT Setup utan tools eller systemInstruction
      this.ws?.send(
        JSON.stringify({
          setup: {
            model: 'models/gemini-3.5-live-translate-preview',
            generationConfig: {
              responseModalities: ['AUDIO'],
              translationConfig: {
                targetLanguageCode: this.targetLang,
                echoTargetLanguage: false,
              },
            },
          },
        })
      );
    };

    this.ws.onmessage = async (evt) => {
      const msg = JSON.parse(evt.data);
      const parts = msg?.serverContent?.modelTurn?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part?.inlineData?.data) {
            // Avkoda Base64 24kHz PCM Int16 och mata LiveKit AudioSource
            const binary = atob(part.inlineData.data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const int16Samples = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);

            this.audioSource?.writeFrame(int16Samples);
          }
        }
      }
    };
  }

  // 2. Skicka 16kHz PCM från mikrofon med Backpressure-kontroll
  public sendAudioChunk(pcm16Int16Buffer: Int16Array) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Backpressure-kontroll (1MB gräns)
    if (this.ws.bufferedAmount > 1024 * 1024) {
      console.warn('WebSocket-bufferten är full, hoppar över ram');
      return;
    }

    const bytes = new Uint8Array(pcm16Int16Buffer.buffer, pcm16Int16Buffer.byteOffset, pcm16Int16Buffer.byteLength);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: 'audio/pcm;rate=16000',
              data: btoa(binary),
            },
          ],
        },
      })
    );
  }

  public destroy() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
