# Steg 1b: Kartlägga (TCK-006)

## Svar på GROW-frågor
1. **Contract:** `AudioTransportAdapter` definieras i `types.ts` med metoderna `connect()`, `disconnect()`, `publishAudio(track: MediaStreamTrack): Promise<string | null>`, `subscribeToTrack(remoteSessionId: string, trackName: string): Promise<void>`, `getRemoteStream(): MediaStream | null`, `getStatus(): 'disconnected' | 'connecting' | 'connected' | 'error'` och `onStatusChange(callback: (status: ...) => void): void`. Detta ger enhetlig anropsyta.
2. **State & Effects:** `CloudflareSFUAdapter` håller intern instans av `RTCPeerConnection`, `sessionId`, `remoteStream` och `status`. Vid övergångar anropas registrerade statuslyssnare synkront, och vid `disconnect()` stängs peer-connection och nollställs strömmar. Vid fel i connect eller förhandling sätts status till `error`.
3. **Resilience:** `unlockAudio()` hålls som en util/metod för iOS Safari-användarinitiering. `CloudflareSFUAdapter` kapslar in nätverkslogik och `useCloudflareSFU` agerar reaktiv brygga som synkroniserar hook-state via `onStatusChange`.

```json
{
  "active_vectors": [
    "transport_adapter_sfu"
  ]
}
```
