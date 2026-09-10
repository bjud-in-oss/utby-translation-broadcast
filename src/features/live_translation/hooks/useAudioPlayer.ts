import { useRef, useCallback, useEffect } from "react";

export interface UseAudioPlayerReturn {
  initAudio: () => Promise<void>;
  playAudioChunk: (base64Data: string) => void;
  stopAudio: () => void;
}

const SAMPLE_RATE_24KHZ = 24000;
const JITTER_BUFFER_SECONDS = 0.04;

export function useAudioPlayer(): UseAudioPlayerReturn {
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const getOrCreateAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (!playbackCtxRef.current || playbackCtxRef.current.state === "closed") {
      playbackCtxRef.current = new AudioContextClass({ sampleRate: SAMPLE_RATE_24KHZ });
      nextStartTimeRef.current = playbackCtxRef.current.currentTime;
    }

    return playbackCtxRef.current;
  }, []);

  const initAudio = useCallback(async (): Promise<void> => {
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch (err) {
        console.warn("Kunde inte återuppta AudioContext vid initAudio:", err);
      }
    }
  }, [getOrCreateAudioContext]);

  const stopAudio = useCallback((): void => {
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
        if (typeof source.disconnect === "function") {
          source.disconnect();
        }
      } catch (err) {
        console.warn("Fel vid tystning av ljudkälla:", err);
      }
    });
    activeSourcesRef.current = [];

    if (playbackCtxRef.current && playbackCtxRef.current.state !== "closed") {
      nextStartTimeRef.current = playbackCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
  }, []);

  const playAudioChunk = useCallback(
    (base64Data: string): void => {
      if (!base64Data || typeof base64Data !== "string") {
        return;
      }

      const ctx = getOrCreateAudioContext();
      if (!ctx || ctx.state === "closed") {
        return;
      }

      if (ctx.state === "suspended") {
        try {
          const res = ctx.resume();
          if (res && typeof res.catch === "function") {
            res.catch((err: unknown) => {
              console.warn("Kunde inte återuppta AudioContext i playAudioChunk:", err);
            });
          }
        } catch (err) {
          console.warn("Synkront fel vid resume i playAudioChunk:", err);
        }
      }

      let binary: string;
      try {
        binary = atob(base64Data);
      } catch (err) {
        console.warn("Ogiltig base64-kodad ljuddata:", err);
        return;
      }

      if (binary.length === 0) {
        return;
      }

      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const sampleCount = Math.floor(bytes.length / 2);
      if (sampleCount === 0) {
        return;
      }

      const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, sampleCount);

      const buffer = ctx.createBuffer(1, int16.length, SAMPLE_RATE_24KHZ);
      const channelData = buffer.getChannelData(0);

      for (let i = 0; i < int16.length; i++) {
        channelData[i] = int16[i] / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime + JITTER_BUFFER_SECONDS;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;

      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      };
    },
    [getOrCreateAudioContext]
  );

  useEffect(() => {
    return () => {
      stopAudio();
      if (playbackCtxRef.current && playbackCtxRef.current.state !== "closed") {
        try {
          const res = playbackCtxRef.current.close();
          if (res && typeof res.catch === "function") {
            res.catch((err: unknown) => {
              console.warn("Fel vid stängning av AudioContext vid unmount:", err);
            });
          }
        } catch (err) {
          console.warn("Synkront fel vid stängning av AudioContext vid unmount:", err);
        }
      }
    };
  }, [stopAudio]);

  return {
    initAudio,
    playAudioChunk,
    stopAudio,
  };
}
