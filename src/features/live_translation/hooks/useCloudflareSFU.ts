import { useState, useCallback, useRef } from 'react';

export type SFUStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * Synkron funktion för ljudupplåsning i iOS Safari / WebKit.
 * Spelar en tyst 0,1s ljudbuffert direkt i användarens klick-handler
 * för att låsa upp webbläsarens AudioContext och WebRTC-mediaströmning.
 */
export function unlockAudio(): AudioContext | null {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    const ctx = new AudioContextClass();
    // Skapa en tyst 0,1s buffer (sampleRate * 0.1 samples)
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  } catch (err) {
    console.warn('[SFU] iOS Safari audio unlock failed:', err);
    return null;
  }
}

const waitForIceGathering = (pc: RTCPeerConnection) => {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
    } else {
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
      }, 3000); // 3-sekunders timeout
    }
  });
};

export function useCloudflareSFU(roomId?: string | null) {
  const [status, setStatus] = useState<SFUStatus>('disconnected');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const publishedTrackRef = useRef<{ sessionId: string; trackName: string } | null>(null);
  const pendingSubRef = useRef<{ remoteSessionId: string; trackName: string } | null>(null);
  const subscribedTracksRef = useRef<Set<string>>(new Set());

  const subscribeToTrack = useCallback(async (remoteSessionId: string, trackName: string) => {
    const pc = peerConnectionRef.current;
    const sessionId = sessionIdRef.current;

    if (!pc || !sessionId) {
      console.log('[SFU] Connection not ready. Queueing track subscription...');
      pendingSubRef.current = { remoteSessionId, trackName };
      return;
    }

    try {
      if (subscribedTracksRef.current.has(trackName)) return;

      let transceiver = pc.getTransceivers()[0];
      if (!transceiver) transceiver = pc.addTransceiver('audio', { direction: 'recvonly' });

      if ((pc.signalingState as string) === 'closed') return;
      const offer = await pc.createOffer();
      if ((pc.signalingState as string) === 'closed') return;
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const localDescription = pc.localDescription;
      if (!localDescription) throw new Error('No local description');

      console.log('[SFU] Waiting 1.5s for Cloudflare edge propagation...');
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Anropa vår Cloudflare Worker-proxy istället för direkt anrop till Cloudflare
      const response = await fetch('/api/sfu/tracks/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          sessionDescription: {
            type: localDescription.type,
            sdp: localDescription.sdp,
          },
          tracks: [
            {
              location: 'remote',
              sessionId: remoteSessionId,
              trackName: trackName,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Cloudflare Worker API error subscribing to track: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.sessionDescription) {
        if ((pc.signalingState as string) === 'closed') return;
        await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
        subscribedTracksRef.current.add(trackName);
        console.log('[SFU] Successfully subscribed to remote audio track:', trackName);
      } else {
        console.error('[SFU] Cloudflare Worker error response:', data);
        throw new Error(`No sessionDescription in response: ${JSON.stringify(data)}`);
      }
    } catch (error: unknown) {
      if (peerConnectionRef.current?.signalingState === 'closed') {
        console.log('[SFU] Connection closed during subscribe, ignoring error.');
        return;
      }
      console.error('[SFU] Failed to subscribe to track:', error);
    }
  }, []);

  const connect = useCallback(async () => {
    // 1. Synkron upplåsning av iOS Safari Web Audio i användarens klick-handler
    unlockAudio();

    console.log('[SFU] connect() triggered in useCloudflareSFU for room:', roomId);

    try {
      setStatus('connecting');

      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: 'stun:stun.cloudflare.com:3478',
          },
        ],
      });
      peerConnectionRef.current = pc;

      // Logga ICE Connection State för att se om nätverk/brandväggar påverkar
      pc.addEventListener('iceconnectionstatechange', () => {
        console.log(`[WebRTC ICE State]: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'failed') {
          console.error('[WebRTC Error] ICE Connection misslyckades. Ingen nätverksväg till Cloudflare Calls.');
        }
      });

      // Logga Signaling State
      pc.addEventListener('signalingstatechange', () => {
        console.log(`[WebRTC Signaling State]: ${pc.signalingState}`);
      });

      pc.ontrack = (event) => {
        console.log('[SFU] Received remote track', event.track.kind);
        if (event.streams && event.streams.length > 0) {
          setRemoteStream(event.streams[0]);
        } else {
          const stream = new MediaStream();
          stream.addTrack(event.track);
          setRemoteStream(stream);
        }
      };

      // Skapa en dummy audio transceiver för att säkerställa att SDP-offern innehåller minst en audio m-line.
      // Cloudflare Calls API avvisar offer utan audio/video-spår med 400 Bad Request.
      pc.addTransceiver('audio', { direction: 'recvonly' });

      if ((pc.signalingState as string) === 'closed') return;
      const offer = await pc.createOffer();
      if ((pc.signalingState as string) === 'closed') return;
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const localDescription = pc.localDescription;
      if (!localDescription) throw new Error('No local description');

      // Skicka SDP Offer till vår Cloudflare Worker-proxy (/api/sfu/session/new)
      console.log('[SFU] Skickar SDP Offer till /api/sfu/session/new:', localDescription.sdp);

      const response = await fetch('/api/sfu/session/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionDescription: {
            type: localDescription.type,
            sdp: localDescription.sdp,
          },
        }),
      });

      const data = await response.json();
      console.log(`[SFU] HTTP Status: ${response.status}`);
      console.log('[SFU] Svar från proxy:', data);

      if (!response.ok) {
        console.error('[SFU Error] Worker API nekade anslutningen.');
        throw new Error(`SFU Proxy error: ${response.status} ${response.statusText}`);
      }

      // Sätt remote description från Cloudflares answer returnerat av proxyn
      if (data && data.sessionDescription && data.sessionDescription.sdp) {
        if ((pc.signalingState as string) === 'closed') return;
        await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
        sessionIdRef.current = data.sessionId;
        setStatus('connected');

        // Hantera eventuell köad prenumeration
        if (pendingSubRef.current) {
          console.log('[SFU] Processing queued subscription...');
          subscribeToTrack(pendingSubRef.current.remoteSessionId, pendingSubRef.current.trackName);
          pendingSubRef.current = null;
        }
      } else {
        console.error('[SFU Error] Proxy returnerade inget SDP Answer! Kritiskt fel i förhandlingen.');
        throw new Error('No sessionDescription in proxy response');
      }
    } catch (error: unknown) {
      if (peerConnectionRef.current?.signalingState === 'closed') {
        console.log('[SFU] Connection closed during connect, ignoring error.');
        return;
      }
      console.error('[SFU] Failed to connect:', error);
      setStatus('disconnected');
    }
  }, [roomId, subscribeToTrack]);

  const disconnect = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    sessionIdRef.current = null;
    setRemoteStream(null);
    setStatus('disconnected');
  }, []);

  const publishAudio = useCallback(async (track: MediaStreamTrack) => {
    const pc = peerConnectionRef.current;
    const sessionId = sessionIdRef.current;

    if (!pc || !sessionId) {
      console.error('[SFU] Cannot publish audio: missing connection or sessionId');
      return null;
    }

    try {
      const transceiver = pc.addTransceiver(track, { direction: 'sendonly' });

      if ((pc.signalingState as string) === 'closed') return null;
      const offer = await pc.createOffer();
      if ((pc.signalingState as string) === 'closed') return null;
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const localDescription = pc.localDescription;
      if (!localDescription) throw new Error('No local description');

      // Anropa /api/sfu/tracks/new via vår säkra Worker-proxy
      const response = await fetch('/api/sfu/tracks/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          sessionDescription: {
            type: localDescription.type,
            sdp: localDescription.sdp,
          },
          tracks: [
            {
              location: 'local',
              mid: transceiver.mid,
              trackName: track.id,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Cloudflare Worker API error publishing track: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.sessionDescription) {
        if ((pc.signalingState as string) === 'closed') return null;
        await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
        console.log('[SFU] Successfully published audio track');
        publishedTrackRef.current = { sessionId, trackName: track.id };
        return sessionId;
      } else {
        throw new Error('No sessionDescription in proxy response for track publish');
      }
    } catch (error: unknown) {
      if (peerConnectionRef.current?.signalingState === 'closed') {
        console.log('[SFU] Connection closed during publish, ignoring error.');
        return null;
      }
      console.error('[SFU] Failed to publish audio:', error);
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
