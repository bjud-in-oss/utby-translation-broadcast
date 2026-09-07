import type { AudioTransportAdapter, AudioTransportStatus } from "./types";

export interface PublishedTrackInfo {
  sessionId: string;
  trackName: string;
}

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const checkState = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", checkState);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", checkState);
    setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", checkState);
      resolve();
    }, 2000);
  });
}

export class CloudflareSFUAdapter implements AudioTransportAdapter {
  private roomId: string;
  private status: AudioTransportStatus = "disconnected";
  private statusListeners: Array<(status: AudioTransportStatus) => void> = [];
  private peerConnection: RTCPeerConnection | null = null;
  private sessionId: string | null = null;
  private remoteStream: MediaStream | null = null;
  private publishedTrack: PublishedTrackInfo | null = null;
  private pendingSub: { remoteSessionId: string; trackName: string } | null = null;

  constructor(roomId: string = "default-room") {
    this.roomId = roomId;
  }

  public getStatus(): AudioTransportStatus {
    return this.status;
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public getPublishedTrack(): PublishedTrackInfo | null {
    return this.publishedTrack;
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  public onStatusChange(callback: (status: AudioTransportStatus) => void): void {
    this.statusListeners.push(callback);
  }

  private setStatus(newStatus: AudioTransportStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      for (const listener of this.statusListeners) {
        listener(newStatus);
      }
    }
  }

  public async connect(): Promise<void> {
    try {
      this.setStatus("connecting");
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      });
      this.peerConnection = pc;

      pc.ontrack = (event) => {
        if (event.streams && event.streams.length > 0) {
          this.remoteStream = event.streams[0];
        } else {
          const stream = new MediaStream();
          stream.addTrack(event.track);
          this.remoteStream = stream;
        }
      };

      pc.addTransceiver("audio", { direction: "recvonly" });

      if ((pc.signalingState as string) === "closed") return;
      const offer = await pc.createOffer();
      if ((pc.signalingState as string) === "closed") return;
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const localDesc = pc.localDescription;
      if (!localDesc) throw new Error("Ingen lokal SDP-beskrivning");

      const response = await fetch("/api/sfu/session/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionDescription: { type: localDesc.type, sdp: localDesc.sdp },
        }),
      });

      if (!response.ok) throw new Error(`Proxy status fel: ${response.status}`);
      const data = (await response.json()) as {
        sessionId: string;
        sessionDescription?: RTCSessionDescriptionInit;
      };

      if (data?.sessionDescription?.sdp && (pc.signalingState as string) !== "closed") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
        this.sessionId = data.sessionId;
        this.setStatus("connected");

        if (this.pendingSub) {
          const sub = this.pendingSub;
          this.pendingSub = null;
          await this.subscribeToTrack(sub.remoteSessionId, sub.trackName);
        }
      } else {
        this.setStatus("error");
      }
    } catch (error) {
      if (this.peerConnection?.signalingState !== "closed") {
        console.error("[CloudflareSFUAdapter] Anslutningsfel:", error);
        this.setStatus("error");
      }
    }
  }

  public disconnect(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.sessionId = null;
    this.remoteStream = null;
    this.publishedTrack = null;
    this.pendingSub = null;
    this.setStatus("disconnected");
  }

  public async publishAudio(track: MediaStreamTrack): Promise<string | null> {
    const pc = this.peerConnection;
    const sessionId = this.sessionId;
    if (!pc || !sessionId) return null;

    try {
      const transceiver = pc.addTransceiver(track, { direction: "sendonly" });
      if ((pc.signalingState as string) === "closed") return null;
      const offer = await pc.createOffer();
      if ((pc.signalingState as string) === "closed") return null;
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const localDesc = pc.localDescription;
      if (!localDesc) throw new Error("Ingen lokal SDP");

      const response = await fetch("/api/sfu/tracks/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sessionDescription: { type: localDesc.type, sdp: localDesc.sdp },
          tracks: [{ location: "local", mid: transceiver.mid, trackName: track.id }],
        }),
      });

      if (!response.ok) return null;
      const data = (await response.json()) as { sessionDescription?: RTCSessionDescriptionInit };

      if (data?.sessionDescription && (pc.signalingState as string) !== "closed") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
        this.publishedTrack = { sessionId, trackName: track.id };
        return sessionId;
      }
      return null;
    } catch {
      return null;
    }
  }

  public async subscribeToTrack(remoteSessionId: string, trackName: string): Promise<void> {
    const pc = this.peerConnection;
    const sessionId = this.sessionId;

    if (!pc || !sessionId) {
      this.pendingSub = { remoteSessionId, trackName };
      return;
    }

    try {
      const existingTransceivers = pc.getTransceivers();
      const hasRecv = existingTransceivers.some((t) => t.direction === "recvonly");
      if (!hasRecv) {
        pc.addTransceiver("audio", { direction: "recvonly" });
      }

      if ((pc.signalingState as string) === "closed") return;
      const offer = await pc.createOffer();
      if ((pc.signalingState as string) === "closed") return;
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const localDesc = pc.localDescription;
      if (!localDesc) throw new Error("Ingen lokal SDP-beskrivning");

      const response = await fetch("/api/sfu/tracks/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sessionDescription: { type: localDesc.type, sdp: localDesc.sdp },
          tracks: [{ location: "remote", sessionId: remoteSessionId, trackName }],
        }),
      });

      if (!response.ok) throw new Error(`Proxy-fel spåren: ${response.status}`);
      const data = (await response.json()) as { sessionDescription?: RTCSessionDescriptionInit };

      if (data?.sessionDescription && (pc.signalingState as string) !== "closed") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sessionDescription));
      }
    } catch (error) {
      if (this.peerConnection?.signalingState !== "closed") {
        console.error("[CloudflareSFUAdapter] Prenumerationsfel:", error);
      }
    }
  }
}
