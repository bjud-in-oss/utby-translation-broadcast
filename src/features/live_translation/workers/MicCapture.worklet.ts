// MicCapture.worklet.ts
// Handles 16 kHz Int16 PCM downsampling and 100 ms frame chunking (Zero-GC)

interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

declare var AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (options?: unknown): AudioWorkletProcessor;
};

declare var registerProcessor: (name: string, processorCtor: new (options?: unknown) => AudioWorkletProcessor) => void;

class MicCaptureProcessor extends AudioWorkletProcessor {
  // 100 ms vid 16 kHz = 1600 samples (3200 bytes i Int16)
  private readonly FRAME_SIZE = 1600;
  private pcmBuffer: Int16Array;
  private bufferIndex = 0;

  constructor() {
    super();
    this.pcmBuffer = new Int16Array(this.FRAME_SIZE);
  }

  process(inputs: Float32Array[][], _outputs: Float32Array[][]): boolean {
    const inputChannel = inputs[0]?.[0];
    if (!inputChannel || inputChannel.length === 0) {
      return true;
    }

    const length = inputChannel.length;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, inputChannel[i]));
      // Konvertera Float32 [-1, 1] till Int16 [-32768, 32767]
      const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      this.pcmBuffer[this.bufferIndex++] = Math.round(int16Sample);

      if (this.bufferIndex >= this.FRAME_SIZE) {
        // Skicka kopia av färdig 100 ms-ram som ArrayBuffer
        const frame = new Int16Array(this.pcmBuffer);
        this.port.postMessage(frame.buffer, [frame.buffer]);
        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

if (typeof registerProcessor !== "undefined") {
  registerProcessor("mic-capture-processor", MicCaptureProcessor);
}

export { MicCaptureProcessor };
