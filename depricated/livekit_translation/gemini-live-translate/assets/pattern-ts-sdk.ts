// assets/pattern-ts-sdk.ts
// Mönster B: TypeScript med officiella @google/genai SDK

import { GoogleGenAI, Modality } from '@google/genai';

export interface LiveTranslateOptions {
  apiKey?: string;
  targetLanguageCode?: string;
  echoTargetLanguage?: boolean;
  onAudioChunk: (base64Audio: string) => void;
  onInputTranscript?: (text: string) => void;
  onOutputTranscript?: (text: string) => void;
  onError?: (error: unknown) => void;
  onClose?: () => void;
}

export async function startSdkLiveTranslate(options: LiveTranslateOptions) {
  const ai = new GoogleGenAI({
    apiKey: options.apiKey || process.env.GEMINI_API_KEY,
  });

  const session = await ai.live.connect({
    model: 'gemini-3.5-live-translate-preview',
    config: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      translationConfig: {
        targetLanguageCode: options.targetLanguageCode || 'sv',
        echoTargetLanguage: options.echoTargetLanguage ?? false,
      },
    },
    callbacks: {
      onmessage: (message: any) => {
        const serverContent = message.serverContent;
        if (!serverContent) return;

        if (serverContent.inputTranscription?.text) {
          options.onInputTranscript?.(serverContent.inputTranscription.text);
        }
        if (serverContent.outputTranscription?.text) {
          options.onOutputTranscript?.(serverContent.outputTranscription.text);
        }

        const parts = serverContent.modelTurn?.parts;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (part.inlineData?.data) {
              options.onAudioChunk(part.inlineData.data);
            }
          }
        }
      },
      onerror: (err) => options.onError?.(err),
      onclose: () => options.onClose?.(),
    },
  });

  // Skicka 16kHz PCM (Base64)
  function sendChunk(base64Pcm16: string) {
    session.sendRealtimeInput({
      mediaChunks: [
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64Pcm16,
        },
      ],
    });
  }

  return { session, sendChunk };
}
