import { useState, useRef, useCallback, useEffect } from 'react';

export type SFUStatus = 'disconnected' | 'connecting' | 'connected';

export interface PublishedTrackInfo {
  sessionId: string;
  trackName: string;
}

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

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    const checkState = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', checkState);
    setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', checkState);
      resolve();
    }, 2000);
  });
}

export function useCloudflareSFU(roomId: string) {
  const [status, setStatus] = useState<SFUStatus>('disconnected');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const publishedTrackRef = useRef<PublishedTrackInfo | null>(null);
  const pendingSubRef = useRef<{ remoteSessionId: string; trackName: string } | null>(null);

  const disconnect = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    sessionIdRef.current = null;
    setRemoteStream(null);
    setStatus('disconnected');
  }, []);

  // Automatisk städning vid unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const subscribeToTrack = useCallback(async (remoteSessionId: string, trackName: string) => {
    const pc = peerConnectionRef.current;
    const sessionId = sessionIdRef.current;

    if (!pc || !sessionId) {
      pendingSubRef.current = { remoteSessionId, trackName };
      return;
    }

    try {
      const existingTransceivers = pc.getTransceivers();
      const hasRecv = existingTransceivers.some((t) => t.direction === 'recvonly');
      if (!hasRecv) {
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }

      if ((pc.signalingState as string) === 'closed') return;
      const offer = await pc.createOffer();
      if ((pc.signalingState as string) === 'closed') return;
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const localDesc = pc.localDescription;
      if (!localDesc) throw new Error('Ingen lokal SDP-beskrivning');

      const response = await fetch('/api/sfu/tracks/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          sessionDescription: { type: localDesc.type, sdp: localDesc.sdp },
          tracks: [{ location: 'remote', sessionId: remoteSessionId, trackName }],
        }),
      });

      if (!response.ok) throw new Error(`Proxy-fel spåren: ${response.status}`);
      const data = (await response.json()) as { sessionDescription?: RTCSessionDescriptionInit };

      if (data?.sessionDescription && (pc.signalingState as string) !== 'closed') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
      }
    } catch (error) {
      if (peerConnectionRef.current?.signalingState !== 'closed') {
        console.error('[SFU] Prenumerationsfel:', error);
      }
    }
  }, []);

  const connect = useCallback(async () => {
    // Synkron ljudupplåsning för iOS Safari i klick-stacken före await
    unlockAudio();

    try {
      setStatus('connecting');
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
      });
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        if (event.streams && event.streams.length > 0) {
          setRemoteStream(event.streams[0]);
        } else {
          const stream = new MediaStream();
          stream.addTrack(event.track);
          setRemoteStream(stream);
        }
      };

      pc.addTransceiver('audio', { direction: 'recvonly' });

      if ((pc.signalingState as string) === 'closed') return;
      const offer = await pc.createOffer();
      if ((pc.signalingState as string) === 'closed') return;
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const localDesc = pc.localDescription;
      if (!localDesc) throw new Error('Ingen lokal SDP');

      const response = await fetch('/api/sfu/session/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionDescription: { type: localDesc.type, sdp: localDesc.sdp },
        }),
      });

      if (!response.ok) throw new Error(`Proxy status: ${response.status}`);
      const data = (await response.json()) as {
        sessionId: string;
        sessionDescription?: RTCSessionDescriptionInit;
      };

      if (data?.sessionDescription?.sdp && (pc.signalingState as string) !== 'closed') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
        sessionIdRef.current = data.sessionId;
        setStatus('connected');

        if (pendingSubRef.current) {
          const sub = pendingSubRef.current;
          pendingSubRef.current = null;
          void subscribeToTrack(sub.remoteSessionId, sub.trackName);
        }
      }
    } catch (error) {
      if (peerConnectionRef.current?.signalingState !== 'closed') {
        console.error('[SFU] Anslutningsfel:', error);
        setStatus('disconnected');
      }
    }
  }, [roomId, subscribeToTrack]);

  const publishAudio = useCallback(async (track: MediaStreamTrack): Promise<string | null> => {
    const pc = peerConnectionRef.current;
    const sessionId = sessionIdRef.current;
    if (!pc || !sessionId) return null;

    try {
      const transceiver = pc.addTransceiver(track, { direction: 'sendonly' });
      if ((pc.signalingState as string) === 'closed') return null;
      const offer = await pc.createOffer();
      if ((pc.signalingState as string) === 'closed') return null;
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const localDesc = pc.localDescription;
      if (!localDesc) throw new Error('Ingen lokal SDP');

      const response = await fetch('/api/sfu/tracks/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          sessionDescription: { type: localDesc.type, sdp: localDesc.sdp },
          tracks: [{ location: 'local', mid: transceiver.mid, trackName: track.id }],
        }),
      });

      if (!response.ok) return null;
      const data = (await response.json()) as { sessionDescription?: RTCSessionDescriptionInit };

      if (data?.sessionDescription && (pc.signalingState as string) !== 'closed') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
        publishedTrackRef.current = { sessionId, trackName: track.id };
        return sessionId;
      }
      return null;
    } catch {
      return null;
    }
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
  };
}
