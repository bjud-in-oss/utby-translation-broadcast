import { useState, useCallback, useRef } from "react";
import { SupportedLanguage, SessionStatus } from "../domain/types";
import { TranslationBridge } from "../domain/translationBridge";
import { AudioResampler } from "../domain/audioResampler";

export function useLiveTranslation() {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>("sv");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const bridgeRef = useRef<TranslationBridge | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const panicMute = useCallback(() => {
    try {
      if (bridgeRef.current) {
        bridgeRef.current.disconnect();
        bridgeRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch (e) {
      console.warn("Fel vid panik-tystning:", e);
    }
    setAudioLevel(0);
    setStatus("idle");
    setError(null);
  }, []);

  const stopTranslation = useCallback(() => {
    panicMute();
  }, [panicMute]);

  const startTranslation = useCallback(async () => {
    setError(null);
    setStatus("connecting");

    const apiKey =
      (typeof process !== "undefined" && process.env.GEMINI_API_KEY) ||
      (typeof import.meta !== "undefined" &&
        (import.meta as unknown as { env: Record<string, string> }).env?.VITE_GEMINI_API_KEY) ||
      "demo_key";

    try {
      // 1. Skapa Web Audio Context
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 48000 });
      audioContextRef.current = audioCtx;

      // 2. Begär mikrofon med DSP-bypass
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Initiera TranslationBridge
      const bridge = new TranslationBridge(apiKey, targetLanguage, {
        onAudioData: (samples: Int16Array) => {
          // Beräkna ljudvolym för mätare
          let sum = 0;
          for (let i = 0; i < samples.length; i += 10) {
            const val = (samples[i] ?? 0) / 0x7fff;
            sum += val * val;
          }
          const rms = Math.sqrt(sum / (samples.length / 10));
          setAudioLevel(Math.min(100, Math.round(rms * 200)));
        },
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
        },
        onError: (err) => {
          setError(err);
        },
      });

      bridgeRef.current = bridge;
      bridge.connect();

      // 4. Ljudupptagning från mikrofon
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = AudioResampler.downsample48kTo16k(inputData);
        bridge.sendAudioChunk(pcm16);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (err) {
      console.warn("Kunde inte starta ljudström:", err);
      setError(err instanceof Error ? err.message : "Mikrofonåtkomst nekad");
      setStatus("error");
    }
  }, [targetLanguage]);

  return {
    status,
    targetLanguage,
    audioLevel,
    error,
    isRotating: status === "rotating",
    startTranslation,
    stopTranslation,
    panicMute,
    setTargetLanguage,
  };
}
