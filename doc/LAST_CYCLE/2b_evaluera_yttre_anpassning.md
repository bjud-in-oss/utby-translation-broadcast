# Steg 2b: Evaluera yttre anpassning (TCK-017)

## 1. Utvärdering av användarupplevelse och gränssnittsmönster
- **Realtidsrespons:** Gränssnittet måste ge omedelbar visuell feedback när ljud upptas. En latency-indikator visar tidsförskjutningen mellan tal och översättning (~1-3s pipeline delay).
- **Ingen lokal VAD:** Bekräftat att gränssnittet inte klipper eller filtrerar tystnad med lokal VAD, vilket annars riskerar att klippa de första orden i föreläsarens meningar.
- **Enkelhet för Talare och Åhörare:** Widgeten anpassar kontroller baserat på roll:
  - Talare (Broadcaster): Startar ljudinmatning och väljer målspråk.
  - Åhörare (Listener): Lyssnar på det översatta spåret utan risk för mikrofonrundgång.
- **Panik-tystning (Panic Mute):** Vid stopp anropas `stopAllAudioPlayback()`, vilket stoppar alla aktiva `AudioBufferSourceNode` och återställer tidslinjen.
- **Tillgänglighet & Kontrast:** Följer WCAG AA med minst 4.5:1 kontrast och fullt tangentbordsstöd.
