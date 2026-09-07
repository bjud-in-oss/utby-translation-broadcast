# Steg 2a: Förändra utåt - Vision (TCK-008)

## Målbild
Skapa en flexibel och hårdvaruoberoende ljudfångst i `useLiveTranslation` som eliminerar `OverconstrainedError` på alla typer av mikrofoner, ljudkort och webbläsare (Chrome, Safari, Firefox, Edge).
Genom att använda rådgivande krav (`sampleRate: { ideal: 16000 }` alternativt ingen fast `sampleRate`-begränsning i MediaTrackConstraints) tillåts webbläsaren initiera mikrofonströmmen med mikrofonens nativa specifikation, medan Web Audio och AudioWorklet utför nödvändig samplings- och formatkonvertering.
