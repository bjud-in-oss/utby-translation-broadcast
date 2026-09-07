import { useState, useRef, useCallback, useEffect } from 'react';
import { CloudflareSFUAdapter } from '../domain/CloudflareSFUAdapter';
import type { PublishedTrackInfo } from '../domain/CloudflareSFUAdapter';
import type { AudioTransportStatus } from '../domain/types';

export type SFUStatus = 'disconnected' | 'connecting' | 'connected';
export type { PublishedTrackInfo };

export function unlockAudio(): AudioContext | null {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    const ctx = new AudioContextClass();
    const silentBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = silentBuffer;
    source.connect(ctx.destination);
    source.start(0);

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    return ctx;
  } catch (err) {
    console.warn('[SFU] Safari audio unlock failed:', err);
    return null;
  }
}

export function useCloudflareSFU(roomId: string) {
  const [status, setStatus] = useState<SFUStatus>('disconnected');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const adapterRef = useRef<CloudflareSFUAdapter | null>(null);
  if (!adapterRef.current) {
    adapterRef.current = new CloudflareSFUAdapter(roomId);
  }
  const publishedTrackRef = useRef<PublishedTrackInfo | null>(null);

  useEffect(() => {
    const adapter = adapterRef.current!;
    adapter.onStatusChange((newStatus: AudioTransportStatus) => {
      if (newStatus === 'connected') {
        setStatus('connected');
        setRemoteStream(adapter.getRemoteStream());
      } else if (newStatus === 'connecting') {
        setStatus('connecting');
      } else {
        setStatus('disconnected');
        setRemoteStream(null);
      }
    });

    return () => {
      adapter.disconnect();
    };
  }, []);

  const disconnect = useCallback(() => {
    adapterRef.current?.disconnect();
    publishedTrackRef.current = null;
    setRemoteStream(null);
    setStatus('disconnected');
  }, []);

  const connect = useCallback(async () => {
    unlockAudio();
    if (!adapterRef.current) return;
    await adapterRef.current.connect();
    setRemoteStream(adapterRef.current.getRemoteStream());
  }, []);

  const publishAudio = useCallback(async (track: MediaStreamTrack): Promise<string | null> => {
    if (!adapterRef.current) return null;
    const sessionId = await adapterRef.current.publishAudio(track);
    if (sessionId) {
      publishedTrackRef.current = adapterRef.current.getPublishedTrack();
    }
    return sessionId;
  }, []);

  const subscribeToTrack = useCallback(async (remoteSessionId: string, trackName: string) => {
    if (!adapterRef.current) return;
    await adapterRef.current.subscribeToTrack(remoteSessionId, trackName);
    setRemoteStream(adapterRef.current.getRemoteStream());
  }, []);

  return {
    status,
    connect,
    disconnect,
    publishAudio,
    subscribeToTrack,
    remoteStream,
    publishedTrackRef,
    unlockAudio,
    adapter: adapterRef.current,
  };
}
