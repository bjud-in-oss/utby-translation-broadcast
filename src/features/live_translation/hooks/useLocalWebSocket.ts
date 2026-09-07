import { useState, useRef, useCallback, useEffect } from "react";
import { LocalWebSocketAdapter } from "../domain/LocalWebSocketAdapter";
import type { AudioTransportStatus } from "../domain/types";

export interface UseLocalWebSocketOptions {
  serverUrl?: string;
  audioCtx?: AudioContext;
}

export function useLocalWebSocket(options?: UseLocalWebSocketOptions | string) {
  const serverUrl = typeof options === "string" ? options : options?.serverUrl;
  const audioCtx = typeof options === "object" ? options?.audioCtx : undefined;

  const [status, setStatus] = useState<AudioTransportStatus>("disconnected");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const adapterRef = useRef<LocalWebSocketAdapter | null>(null);
  if (!adapterRef.current) {
    adapterRef.current = new LocalWebSocketAdapter(serverUrl, audioCtx);
  }

  useEffect(() => {
    const adapter = adapterRef.current!;
    adapter.onStatusChange((newStatus: AudioTransportStatus) => {
      setStatus(newStatus);
      setRemoteStream(adapter.getRemoteStream());
    });

    return () => {
      adapter.disconnect();
    };
  }, []);

  const connect = useCallback(async () => {
    if (!adapterRef.current) return;
    await adapterRef.current.connect();
    setStatus(adapterRef.current.getStatus());
    setRemoteStream(adapterRef.current.getRemoteStream());
  }, []);

  const disconnect = useCallback(() => {
    if (adapterRef.current) {
      adapterRef.current.disconnect();
    }
    setRemoteStream(null);
    setStatus("disconnected");
  }, []);

  const publishAudio = useCallback(async (track: MediaStreamTrack): Promise<string | null> => {
    if (!adapterRef.current) return null;
    return adapterRef.current.publishAudio(track);
  }, []);

  const subscribeToTrack = useCallback(async (remoteSessionId: string, trackName: string): Promise<void> => {
    if (!adapterRef.current) return;
    await adapterRef.current.subscribeToTrack(remoteSessionId, trackName);
    setRemoteStream(adapterRef.current.getRemoteStream());
  }, []);

  return {
    status,
    remoteStream,
    connect,
    disconnect,
    publishAudio,
    subscribeToTrack,
    adapter: adapterRef.current,
  };
}
