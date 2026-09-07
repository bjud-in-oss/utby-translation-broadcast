# Affärsregler för Live Translation

## 1. Sessionshantering och Tidsgränser
- Gemini Live Translate API stänger sessioner hårt vid 15 minuter.
- Bryggan initierar proaktiv hot-swap vid 14:00 (840 sekunder).
- Cloudflare SFU och Web Audio AudioTracks bibehålls intakta under rotation.
- Vid oväntat anslutningstapp sker automatisk återanslutning med exponential backoff (3 försök: 1s, 2s, 4s).
- WebAudio AudioContext låses upp synkront vid startklick för att kringgå iOS Safari autoplay-spärr.

## 2. Ljud- och Pacing-regler
- Mikrofonupptagning samplas om från 48 kHz till 16 kHz mono Int16 med 3-punkts anti-aliasing lågpassfilter.
- Gemini Live Translate levererar 24 kHz Int16 Little-Endian mono.
- Frame pacing körs med metronom var 20:e ms (480 samplar per ram).
- Backpressure-tröskel är 128 KB; icke-kritiska ramar släpps vid överskridande.

## 3. Säkerhet och Integritet
- API-nycklar skyddas och exponeras inte i oskyddade loggar.
- Setup-payload isoleras: inga verktyg eller systeminstruktioner skickas.
- Ljudingång stöder val av valfri mikrofon eller NDI Webcam Input via deviceId.
- Parallella tolkkanaler körs isolerat per språk (`translator-[språkkod]`).
- Lyssnare tar endast emot valt språk; övriga kanaler tystas automatiskt.
- Panik-tystning avbryter omedelbart all ljuduppspelning och tömmer köer.
