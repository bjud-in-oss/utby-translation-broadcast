# Steg 3a: Helhet, orkestrering och integration (TCK-021)

## 1. Integrationsarkitektur
- `AudioResampler.downsample48kTo16k`: Tar in `Float32Array` från Web Audio API och genererar ren, anti-alias-filtrerad `Int16Array` mono.
- `useLiveTranslation`: Initierar ljudkedjan och förnyar automatiskt enhetslistan med faktiska enhetsnamn när `getUserMedia` godkänts, samt lyssnar på `navigator.mediaDevices.ondevicechange`.
- Integrerar felfritt med `LiveTranslationWidget`.
