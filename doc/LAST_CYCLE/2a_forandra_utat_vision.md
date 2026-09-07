# Steg 2a: Förändra utåt - Vision (TCK-006)

## Målbild
Skapa en modulär och utbytbar transportarkitektur för simultantolkning.
Genom att frikoppla ljudtransporten bakom gränssnittet `AudioTransportAdapter` kan applikationen sömlöst växla mellan Cloudflare Calls WebRTC SFU och lokala TCP WebSocket-bryggor utan ändringar i den överliggande domänlogiken eller användargränssnittet.
