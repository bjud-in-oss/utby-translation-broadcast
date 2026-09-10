import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';
import dotenv from 'dotenv';

// 1. Ladda miljövariabler (.env.local)
dotenv.config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ Fel: Saknar GEMINI_API_KEY i .env.local');
  process.exit(1);
}

// 2. Läs in ljudfilen (16kHz, 16-bit PCM, Mono) och skala bort WAV-headern
const audioPath = path.join(process.cwd(), 'test-audio-16k.wav');
if (!fs.existsSync(audioPath)) {
  console.error(`❌ Fel: Hittade inte ljudfilen på ${audioPath}`);
  process.exit(1);
}

const wavBuffer = fs.readFileSync(audioPath);
const pcmBuffer = wavBuffer.subarray(44); // Skala bort 44-byte headern

// 3. Etablera WebSocket-anslutning mot Gemini Live API
const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
const ws = new WebSocket(url);

let receivedAudioBytes = 0;
const receivedChunks: Buffer[] = []; // Samla inkommande ljudpaket

// Hjälpfunktion för att skapa en korrekt WAV-header (Gemini returnerar 24kHz)
function createWavHeader(dataLength: number, sampleRate = 24000): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20);  // AudioFormat (PCM)
  header.writeUInt16LE(1, 22);  // NumChannels (Mono)
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  header.writeUInt16LE(2, 32);  // BlockAlign (NumChannels * BitsPerSample/8)
  header.writeUInt16LE(16, 34); // BitsPerSample
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

ws.on('open', () => {
  console.log('🔌 Ansluten till Gemini Live API...');

  // 4. Skicka setup-konfiguration med den nya översättningsmodellen
  const setupMessage = {
  setup: {
    model: 'models/gemini-3.5-live-translate-preview',
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
        },
          // translationConfig MÅSTE ligga inuti generationConfig!
          translationConfig: {
          targetLanguageCode: 'en' // Översätter svenska källjudet till engelska
        }
      }
    }
  };
  ws.send(JSON.stringify(setupMessage));

  // 5. Strömma ljudfilen i chunks om 100 ms (3200 byte per chunk vid 16kHz)
  const chunkSize = 3200;
  let offset = 0;

  console.log('🎙️ Börjar strömma testljudet till Gemini...');
  const interval = setInterval(() => {
    if (offset >= pcmBuffer.length) {
      clearInterval(interval);
      console.log('📤 Hela filen har skickats. Väntar på slutfört svar...');
      return;
    }

    const chunk = pcmBuffer.subarray(offset, offset + chunkSize);
    offset += chunkSize;

    const mediaMessage = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: chunk.toString('base64')
          }
        ]
      }
    };
    ws.send(JSON.stringify(mediaMessage));
  }, 100);
});

// 6. Lyssna på inkommande översatt ljud och spara i arrayen
ws.on('message', (data) => {
  try {
    const response = JSON.parse(data.toString());
    const inlineData = response.serverContent?.modelTurn?.parts?.[0]?.inlineData;

    if (inlineData?.data) {
      const audioBuffer = Buffer.from(inlineData.data, 'base64');
      receivedChunks.push(audioBuffer);
      receivedAudioBytes += audioBuffer.length;
      console.log(`🔊 Mottog tolkat ljud: ${audioBuffer.length} bytes (Totalt: ${receivedAudioBytes} bytes)`);
    }
    
    // Hantera eventuella felmeddelanden i strukturen
    if(response.error) {
       console.error("⚠️ Gemini returnerade ett fel:", response.error);
    }
  } catch (err) {
    console.error('Kunde inte tolka inkommande JSON:', err);
  }
});

// 7. Utvärdera testresultat och spara till disk när anslutningen stängs
ws.on('close', (code, reason) => {
  console.log(`🔌 Anslutning stängd: ${code} ${reason ? `- ${reason}` : ''}`);
  
  if (receivedChunks.length > 0) {
    console.log(`\n✅ TEST PASSED: Gemini svarade med totalt ${receivedAudioBytes} bytes tolkat ljud!`);
    
    // Sammanfoga alla inkommande bitar och lägg på WAV-header
    const rawPcm = Buffer.concat(receivedChunks);
    const wavHeader = createWavHeader(rawPcm.length, 24000); 
    const fullWav = Buffer.concat([wavHeader, rawPcm]);

    // Skriv till disk
    const outputPath = path.join(process.cwd(), 'output-translated.wav');
    fs.writeFileSync(outputPath, fullWav);
    console.log(`🎧 Sparade den tolkade ljudfilen som: ${outputPath}`);
    
    process.exit(0);
  } else {
    console.error('\n❌ TEST FAILED: Inget ljud togs emot från Gemini.');
    process.exit(1);
  }
});

ws.on('error', (err) => {
  console.error('❌ WebSocket-fel:', err);
});

// Säkerhetstimeout efter 15 sekunder (ger Gemini tid att översätta och svara)
setTimeout(() => {
  console.log('⏳ Stänger anslutningen efter timeout...');
  ws.close();
}, 15000);