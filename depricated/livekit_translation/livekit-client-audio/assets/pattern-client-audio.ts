import { Room, RoomEvent, RemoteTrack, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';

export interface SetupAudioOptions {
  serverUrl: string;
  token: string;
  targetLanguage: string;
  onAudioTrackSubscribed?: (track: RemoteTrack) => void;
}

/**
 * Ansluter till LiveKit-rummet, hanterar iOS Safari audio recovery
 * och prenumererar selektivt på rätt översatta ljudspår.
 */
export async function setupLiveKitClientAudio({
  serverUrl,
  token,
  targetLanguage,
  onAudioTrackSubscribed,
}: SetupAudioOptions): Promise<Room> {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  // 1. Hantera Safari iOS "interrupted" & "suspended" tillstånd
  const handleAudioContextRecovery = () => {
    const audioCtx = (room as any).audioContext as AudioContext | undefined;
    if (audioCtx) {
      audioCtx.onstatechange = () => {
        if (audioCtx.state === 'interrupted' || audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
      };
    }
  };

  // 2. Lyssna på spår och prenumerera enbart på valt målspråk
  room.on(
    RoomEvent.TrackSubscribed,
    (track: RemoteTrack, publication: RemoteTrackPublication, _participant: RemoteParticipant) => {
      const expectedTrackName = `translation_${targetLanguage}`;
      
      if (publication.trackName === expectedTrackName || publication.trackName === 'microphone') {
        const audioElement = track.attach();
        document.body.appendChild(audioElement);
        onAudioTrackSubscribed?.(track);
      } else {
        // Avbryt prenumeration på övriga språks spår för att spara bandbredd
        publication.setSubscribed(false);
      }
    }
  );

  await room.connect(serverUrl, token);
  handleAudioContextRecovery();

  return room;
}
