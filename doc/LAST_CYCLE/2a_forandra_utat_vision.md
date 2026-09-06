# Steg 2a: Förändra utåt (Vision & Gränssnitt) - TCK-019

## 1. Yttre gränssnittsförändring och användarupplevelse
Arrangören och användarna får en avsevärt mer kapabel tolkstation:
1. **Ljudingångsväljare:** En ny dropdown visar alla tillgängliga mikrofoner och virtuella ingångar (inklusive NDI Webcam Input / BlackHole / virtuella ljudkablar) med realtidsstatus.
2. **Parallell tolkning:** Arrangören kan aktivera flera samtidiga målspråk samtidigt. Varje språk körs i en separat bakgrundsbrygga under `translator-[språkkod]`.
3. **Selektiv lyssning:** Lyssnare kan välja sitt önskade språk bland alla globala språk (inklusive Swahili, Somaliska, Amhariska etc.). Övriga kanaler tystas direkt för en ren ljudupplevelse.
4. **Strukturerad språkmeny:** Målspråken är grupperade geografiskt i rullgardinsmenyn för snabb och intuitiv överblick.

## 2. Visuell design och tillgänglighet
- Tydlig visuell separation mellan arrangörsinställningar (ingångskälla) och tolkkanaler.
- Tydliga statusbrickor för varje aktiv språkbrygga.
- Snabbtystning (panikknapp) tystar samtliga parallella strömmar med ett klick.
