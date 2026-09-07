# Local WebSocket + WSOLA Transport Guidelines

Denna skill dokumenterar riktlinjer och arkitekturkrav för lokal ljudströmning över TCP-baserade WebSockets i nätverksmiljöer med strikt låsta UDP-portar (exempelvis kyrkor, skolor och offentliga Wi-Fi-nät).

---

## 1. Transport-Adapter & Gränssnitt
För att hålla domänlogiken oberoende av sändningstyp ska den lokala WebSocket-transporten implementera det gemensamma gränssnittet `AudioTransportAdapter`:

* **`connect(): Promise<void>`**: Etablerar WebSocket-anslutningen och utför nödvändig handskakning.
* **`disconnect(): void`**: Stänger anslutningen, stoppar timrar och frigör resurser.
* **`publish(pcmData: Int16Array): void`**: Sänder 16 kHz Int16 PCM-ljud från sändardatorn till den lokala reläservern.
* **`subscribe(onAudio: (pcmData: Int16Array) => void): void`**: Registrerar mottagarens callback för inkommande tolkljud.

---

## 2. Buffertstyrning & Jitterresiliens (`AudioProcessor.worklet.ts`)
I låsta nätverk kan TCP ge upphov till mikropauser vid paketefterfrågan. Ljudmotorn ska parera detta genom reaktiv tryckmätning i ringbufferten:

* **Målnivå**: **300 ms** ($24\text{ }000\text{ Hz} \times 0{,}30 = 7\text{ }200\text{ samples}$).
* **Slew Rate Limiting (`BASE_SLEW = 0.002`)**:
  * **Målnivå (300 ms)**: $1{,}00\times$ normal uppspelningshastighet.
  * **Låg/Måttlig backlog ($<25\text{ s}$)**: Linjär uppsnabbning från $1{,}00\times$ till max $1{,}01\times$.
  * **Hög backlog ($>25\text{ s}$)**: Maximeras till $1{,}03\times$ för att dränera bufferten under skurar från AI-inferensen.
* **Tystnad & Anti-click**:
  * **Fade-ut**: Vid fyllnadsgrad $< 128\text{ samples}$ (~5 ms) fejdas ljudet ner mjukt för att förhindra sprak.
  * **Frame Dropping**: Om nätverksfördröjningen överskrider 500 ms kasta gamla ramar och hoppa direkt till de senaste 200 ms.

---

## 3. Minnesprestanda (Zero-GC)
För att förhindra att V8-motorns skräpsamling (Garbage Collection) orsakar hack i ljudet gäller följande strikta regler:

* Inga `new Array()`, `new Float32Array()` eller objektallokeringar inuti `process()`-loopen eller WebSocket-meddelandehanteraren.
* Alla cirkulära ringbuffertar (`Float32Array`) och pekar-arrayer (`Int32Array`) ska förallokeras i minnet vid initiering.
* Använd `Atomics`-anrop (`Atomics.load` / `Atomics.store`) för trådsäker synkronisering mellan huvudtråden och `AudioWorkletNode`.

---

## 4. Brandväggs- & Mixed Content-skydd
* **HTTPS / WSS-krav**: När klienten körs över HTTPS blockerar webbläsaren okerpterade `ws://`-anslutningar.
* **Dynamic Protocol Switch**: Klienten ska automatiskt välja `wss://` om applikationsursprunget är HTTPS, samt stöda lokal TLS (via exempelvis `mkcert` eller tunnlar) i kyrkmiljön.
* **Port 443 Fallback**: WebSocket-reläet ska i första hand exponeras över standardport 443 för att garanterat passera kyrkans utgående HTTP/HTTPS-filter.

---

## 5. Klockförskjutning (Clock Drift)
Eftersom sändarens och mottagarens hardware-klockor skiljer sig några enstaka Hz ska `AudioProcessor.worklet.ts` kontinuerligt tillämpa adaptiv mikroslew ($\pm 1\text{--}3\%$) utifrån ringbuffertens tryck för att förhindra klickljud och buffertöverflöd vid långa sändningar.