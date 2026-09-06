import { useState, useCallback, useRef } from 'react';
import { getOrgIdByInviteCode } from '../services/byokService';
import { fetchSecureCredentials } from '../services/credentialsService';

export type SFUStatus = 'disconnected' | 'connecting' | 'connected';

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
      }, 3000); // 3 second timeout
    }
  });
};

export function useCloudflareSFU(roomId: string | null) {
  const [status, setStatus] = useState<SFUStatus>('disconnected');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const publishedTrackRef = useRef<{ sessionId: string, trackName: string } | null>(null);
  const pendingSubRef = useRef<{remoteSessionId: string, trackName: string} | null>(null);
  const subscribedTracksRef = useRef<Set<string>>(new Set());

  const getSfuCredentials = async () => {
    if (!roomId) throw new Error("No roomId");
    const orgId = await getOrgIdByInviteCode(roomId);
    if (!orgId) throw new Error("Invalid orgId");
    return await fetchSecureCredentials(orgId);
  };

  const subscribeToTrack = useCallback(async (remoteSessionId: string, trackName: string) => {
    const pc = peerConnectionRef.current;
    const sessionId = sessionIdRef.current;

    if (!pc || !sessionId) {
        console.log("[SFU] Connection not ready. Queueing track subscription...");
        pendingSubRef.current = { remoteSessionId, trackName };
        return;
    }

    let appId: string | null = null;
    let appSecret: string | null = null;
    try {
      const creds = await getSfuCredentials();
      appId = creds.sfuKey1;
      appSecret = creds.sfuKey2;
    } catch (e) {
      console.error("[SFU] Failed to get credentials:", e);
      return;
    }

    if (!appId || !appSecret) {
      console.error("[SFU] Cannot subscribe to track: missing connection or credentials", { pc: !!pc, sessionId, appId: !!appId, appSecret: !!appSecret });
      return;
    }

    try {
      if (subscribedTracksRef.current.has(trackName)) return;

      let transceiver = pc.getTransceivers()[0];
      if (!transceiver) transceiver = pc.addTransceiver('audio', { direction: 'recvonly' });

      if (pc.signalingState === 'closed') return;
      const offer = await pc.createOffer();
      if (pc.signalingState === 'closed') return;
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const localDescription = pc.localDescription;
      if (!localDescription) throw new Error("No local description");

      console.log("[SFU] Waiting 1.5s for Cloudflare edge propagation...");
      await new Promise(resolve => setTimeout(resolve, 1500));

      const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${appId}/sessions/${sessionId}/tracks/new`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionDescription: {
            type: localDescription.type,
            sdp: localDescription.sdp
          },
          tracks: [
            {
              location: "remote",
              sessionId: remoteSessionId,
              trackName: trackName
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Cloudflare API error subscribing to track: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data && data.sessionDescription) {
        if (pc.signalingState === 'closed') return;
        await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
        subscribedTracksRef.current.add(trackName);
        console.log("[SFU] Successfully subscribed to remote audio track");
      } else {
        console.error("[SFU] Cloudflare error response:", data);
        throw new Error(`No sessionDescription. Response: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      if (peerConnectionRef.current?.signalingState === 'closed') {
        console.log("[SFU] Connection closed during subscribe, ignoring error.");
        return;
      }
      console.error("[SFU] Failed to subscribe to track:", error);
    }
  }, [roomId]);

  const connect = useCallback(async () => {
    console.log("[Checkpoint 4] connect() triggered in useCloudflareSFU for room:", roomId);
    if (!roomId) {
      console.warn("[Checkpoint 4b] connect() avbröts: roomId är null eller tomt");
      return;
    }
    
    let appId: string | null = null;
    let appSecret: string | null = null;
    try {
      console.log("[Checkpoint 4c] Fetching SFU credentials from backend...");
      const creds = await getSfuCredentials();
      console.log("[Checkpoint 5] Credentials fetched successfully. AppID:", creds.sfuKey1 ? "Present" : "Missing");
      appId = creds.sfuKey1;
      appSecret = creds.sfuKey2;
    } catch (e) {
      console.error("[SFU] Failed to get credentials:", e);
      return;
    }

    if (!appId || !appSecret) {
      console.error("[SFU] Cloudflare credentials missing in environment variables");
      return;
    }

    try {
      setStatus('connecting');

      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: 'stun:stun.cloudflare.com:3478'
          }
        ]
      });
      peerConnectionRef.current = pc;

      // 1. Logga ICE Connection State för att se om brandväggar/nätverk blockerar
      pc.addEventListener('iceconnectionstatechange', () => {
        console.log(`[WebRTC ICE State]: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'failed') {
          console.error("[WebRTC Error] ICE Connection misslyckades. Detta betyder att Cloudflare och klienten inte kunde hitta en nätverksväg till varandra.");
        }
      });

      // 2. Logga Signaling State
      pc.addEventListener('signalingstatechange', () => {
        console.log(`[WebRTC Signaling State]: ${pc.signalingState}`);
      });

      pc.ontrack = (event) => {
        console.log("[SFU] Received remote track", event.track.kind);
        if (event.streams && event.streams.length > 0) {
            setRemoteStream(event.streams[0]);
        } else {
            const stream = new MediaStream();
            stream.addTrack(event.track);
            setRemoteStream(stream);
        }
      };

      // Create a dummy audio transceiver to ensure the SDP offer has at least one audio m-line.
      // Cloudflare Calls API rejects offers without audio/video tracks with a 400 Bad Request.
      pc.addTransceiver('audio', { direction: 'recvonly' });

      if (pc.signalingState === 'closed') return;
      // Create an offer
      const offer = await pc.createOffer();
      if (pc.signalingState === 'closed') return;
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const localDescription = pc.localDescription;
      if (!localDescription) throw new Error("No local description");

      // Send offer to Cloudflare Calls API
      console.log("[Cloudflare] Skickar SDP Offer till Cloudflare:", localDescription.sdp);
      
      const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${appId}/sessions/new`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionDescription: {
            type: localDescription.type,
            sdp: localDescription.sdp
          }
        })
      });

      const data = await response.json();
      console.log(`[Cloudflare] HTTP Status: ${response.status}`);
      console.log("[Cloudflare] Svar från servern:", data);

      if (!response.ok) {
        console.error("[Cloudflare Error] API nekade anslutningen. Kontrollera API-nycklar och URL.");
        throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
      }
      
      // Set remote description from Cloudflare's answer
      if (data && data.sessionDescription && data.sessionDescription.sdp) {
        if (pc.signalingState === 'closed') return;
        await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
        sessionIdRef.current = data.sessionId;
        setStatus('connected');

        // Process eventuell sparad prenumeration
        if (pendingSubRef.current) {
            console.log("[SFU] Processing queued subscription...");
            subscribeToTrack(pendingSubRef.current.remoteSessionId, pendingSubRef.current.trackName);
            pendingSubRef.current = null;
        }
      } else {
        console.error("[Cloudflare Error] Cloudflare returnerade inget SDP Answer! Kritiskt fel i förhandlingen.");
        throw new Error("No sessionDescription in Cloudflare response");
      }

    } catch (error: any) {
      if (peerConnectionRef.current?.signalingState === 'closed') {
        console.log("[SFU] Connection closed during connect, ignoring error.");
        return;
      }
      console.error("[SFU] Failed to connect:", error);
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
    
    let appId: string | null = null;
    let appSecret: string | null = null;
    try {
      const creds = await getSfuCredentials();
      appId = creds.sfuKey1;
      appSecret = creds.sfuKey2;
    } catch (e) {
      console.error("[SFU] Failed to get credentials:", e);
      return;
    }

    if (!pc || !sessionId || !appId || !appSecret) {
      console.error("[SFU] Cannot publish audio: missing connection or credentials");
      return;
    }

    try {
      const transceiver = pc.addTransceiver(track, { direction: 'sendonly' });

      if (pc.signalingState === 'closed') return null;
      const offer = await pc.createOffer();
      if (pc.signalingState === 'closed') return null;
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const localDescription = pc.localDescription;
      if (!localDescription) throw new Error("No local description");

      const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${appId}/sessions/${sessionId}/tracks/new`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionDescription: {
            type: localDescription.type,
            sdp: localDescription.sdp
          },
          tracks: [
            {
              location: "local",
              mid: transceiver.mid,
              trackName: track.id
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Cloudflare API error publishing track: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data && data.sessionDescription) {
        if (pc.signalingState === 'closed') return null;
        await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
        console.log("[SFU] Successfully published audio track");
        publishedTrackRef.current = { sessionId, trackName: track.id };
        return sessionId;
      } else {
        throw new Error("No sessionDescription in Cloudflare response for track publish");
      }
    } catch (error: any) {
      if (peerConnectionRef.current?.signalingState === 'closed') {
        console.log("[SFU] Connection closed during publish, ignoring error.");
        return null;
      }
      console.error("[SFU] Failed to publish audio:", error);
      return null;
    }
  }, [roomId]);

  return { status, connect, disconnect, publishAudio, subscribeToTrack, remoteStream, publishedTrackRef };
}