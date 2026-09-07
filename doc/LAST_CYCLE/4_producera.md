# Steg 4: Producera (TCK-006)

## Genomförda förändringar
1. **src/features/live_translation/domain/types.ts**:
   - Definerat `AudioTransportStatus` ('disconnected' | 'connecting' | 'connected' | 'error').
   - Skapat gränssnittet `AudioTransportAdapter` med kontraktet:
     - `connect(): Promise<void>`
     - `disconnect(): void`
     - `publishAudio(track: MediaStreamTrack): Promise<string | null>`
     - `subscribeToTrack(remoteSessionId: string, trackName: string): Promise<void>`
     - `getRemoteStream(): MediaStream | null`
     - `getStatus(): AudioTransportStatus`
     - `onStatusChange(callback: (status: AudioTransportStatus) => void): void`
2. **src/features/live_translation/domain/CloudflareSFUAdapter.ts**:
   - Implementerat `AudioTransportAdapter` för WebRTC Cloudflare Calls SFU.
   - Hanterar SDP-sessioner via `/api/sfu/session/new` och spår via `/api/sfu/tracks/new`.
   - Implementerar ICE gathering await och hanterar `ontrack`-händelser för fjärrström.
   - Exponerar `getRoomId()` och `getPublishedTrack()`.
3. **src/features/live_translation/hooks/useCloudflareSFU.ts**:
   - Refaktoriserat hooken till att internt använda `CloudflareSFUAdapter`.
   - Bevarat bakåtkompatibilitet för `unlockAudio`, `publishedTrackRef` och status.
4. **src/features/live_translation/domain/__tests__/transportAdapter.test.ts**:
   - TDD enhetstester med mockning av RTCPeerConnection, WebSocket och AudioContext.
5. **src/features/live_translation/index.ts**:
   - Re-exporterat `AudioTransportAdapter`, `AudioTransportStatus` och `CloudflareSFUAdapter`.
