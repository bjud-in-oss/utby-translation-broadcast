# Steg 3a: Helhet, orkestrering och integration (TCK-006)

Orkestreringsflödet:
1. `useCloudflareSFU` instansierar en `CloudflareSFUAdapter`.
2. Hooken lyssnar på adaptern via dess `onStatusChange`-metod och exponerar reaktiv state till React-vyn.
3. Vid `connect()` körs först `unlockAudio()` (synkront vid användarklick) och därefter adapterns `connect()`.
4. `publishAudio`, `subscribeToTrack` och `disconnect` delegeras direkt till adaptern.
