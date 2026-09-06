// assets/pattern-raw-ws.ts
// Mönster A: Rå WebSocket-klient för webbläsare (Låglatent)

export function initLiveTranslateWebSocket({
  apiKey,
  accessToken,
  targetLanguage = 'sv',
  echoTargetLanguage = false,
  onOpen,
  onSetupComplete,
  onAudioChunk,
  onTranscript,
  onError,
  onClose,
}: {
  apiKey?: string;
  accessToken?: string;
  targetLanguage?: string;
  echoTargetLanguage?: boolean;
  onOpen?: () => void;
  onSetupComplete?: () => void;
  onAudioChunk?: (base64Audio: string) => void;
  onTranscript?: (text: string, type: 'source' | 'target') => void;
  onError?: (err: Event | Error) => void;
  onClose?: () => void;
}) {
  const authQuery = accessToken
    ? `access_token=${encodeURIComponent(accessToken)}`
    : `key=${encodeURIComponent(apiKey || '')}`;

  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?${authQuery}`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    onOpen?.();
    // 1. Skicka setup direkt vid öppen anslutning
    ws.send(
      JSON.stringify({
        setup: {
          model: 'models/gemini-3.5-live-translate-preview',
          generationConfig: {
            responseModalities: ['AUDIO'],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            translationConfig: {
              targetLanguageCode: targetLanguage,
              echoTargetLanguage: echoTargetLanguage,
            },
          },
        },
      })
    );
  };

  ws.onmessage = async (event: MessageEvent) => {
    let payload: any;
    try {
      if (event.data instanceof Blob) {
        payload = JSON.parse(await event.data.text());
      } else if (typeof event.data === 'string') {
        payload = JSON.parse(event.data);
      } else {
        return;
      }
    } catch (parseError) {
      console.error('Kunde inte parsa inkommande WebSocket JSON:', parseError);
      return;
    }

    // 2. Bekräftelse på sessionsetup
    if (payload?.setupComplete) {
      onSetupComplete?.();
      return;
    }

    // 3. Robust extrahering djupt i JSON-trädet (serverContent)
    const serverContent = payload?.serverContent;
    if (serverContent) {
      // Inkommande källtranskription
      if (serverContent.inputTranscription?.text) {
        onTranscript?.(serverContent.inputTranscription.text, 'source');
      }

      // Inkommande måltranskription
      if (serverContent.outputTranscription?.text) {
        onTranscript?.(serverContent.outputTranscription.text, 'target');
      }

      // Modellens svarsturn med ljud- och textdelar
      const parts = serverContent.modelTurn?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part?.inlineData?.data) {
            // Rå 24kHz PCM i base64
            onAudioChunk?.(part.inlineData.data);
          }
          if (part?.text) {
            onTranscript?.(part.text, 'target');
          }
        }
      }
    }
  };

  ws.onerror = (err) => {
    onError?.(err);
  };

  ws.onclose = () => {
    onClose?.();
  };

  // 4. Skicka rå 16kHz PCM (Int16 Little-Endian)
  function sendAudioPcm16(pcm16: Int16Array) {
    if (ws.readyState !== WebSocket.OPEN) return;

    const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    ws.send(
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

  function close() {
    ws.onclose = null;
    ws.onerror = null;
    try {
      ws.close();
    } catch (_) {}
  }

  return {
    ws,
    sendAudioPcm16,
    close,
  };
}
