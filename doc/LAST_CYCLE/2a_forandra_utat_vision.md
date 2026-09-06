# Steg 2a: Förändra utåt (Vision & Gränssnitt) - TCK-018

## 1. Yttre gränssnittsförändring och användarupplevelse
När användaren öppnar eller förhandsgranskar applikationen möts hen direkt av tolkgränssnittet för Live Translation:
- Huvudrubrik: "Live Translation"
- Beskrivande undertitel: "Realtids simultantolkning med Gemini Live och LiveKit SFU"
- Centrerad insticksmodul: `<LiveTranslationWidget />` med kontroller för start/avsluta, val av målspråk, ljudmätare och panik-tystning.
- Demokomponenten med räknaren (`ExampleWidget`) är helt borta.

## 2. Visuell design
- Ren, sofistikerad ljus layout på `bg-stone-100`.
- Tydlig typografi och gott om andrum för en fokuserad tolkapparat.
