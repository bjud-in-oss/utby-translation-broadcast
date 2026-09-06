
// AudioProcessor.worklet.ts
// Ported from Linux C++ LockFreeAudioBuffer architecture.
// Handles raw PCM interpolation, thread-safe ring buffering, and elastic time-stretching.

interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

declare var AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (options?: any): AudioWorkletProcessor;
};

declare var registerProcessor: (name: string, processorCtor: (new (options?: any) => AudioWorkletProcessor)) => void;

class AudioProcessor extends AudioWorkletProcessor {
  // Shared Memory Buffers
  private audioBuffer: Float32Array | null = null;
  private writeIndexPtr: Int32Array | null = null;
  private readIndexPtr: Int32Array | null = null;

  // Internal State
  private localReadIndex: number = 0.0; // Double precision for Lerp
  private mask: number = 0;
  private bufferSize: number = 0;
  private initialized: boolean = false;

  // Gain Ramping (Anti-Click)
  private currentGain: number = 0.0;
  private targetGain: number = 0.0;
  private readonly GAIN_ATTACK = 0.05; // Fast ramp up
  private readonly GAIN_DECAY = 0.01;  // Slower ramp down

  // Elastic Rate Config - UPDATED FOR HYBRID VELOCITY (DPI)
  private readonly SAMPLE_RATE = 24000;
  private readonly TARGET_LATENCY_FRAMES = 24000 * 0.30; // 300ms målbuffert
  
  // NEW THRESHOLDS: Updated to 25 seconds for "Rocket Mode" pitch interaction
  private readonly HIGH_LATENCY_THRESHOLD = 24000 * 25; 
  
  private readonly BASE_SLEW = 0.002; // Tröghet i hastighetsförändring
  
  // State för nuvarande uppspelningshastighet
  private currentSpeed: number = 1.0;

  // Status reporting throttling
  private framesSinceLastReport = 0;

  // ECO MODE STATE (Matches workerScripts.ts)
  private silenceCounter = 0;
  private isSilent = false;
  private readonly SILENCE_THRESHOLD = 0.001; // ~ -60dB
  private readonly IDLE_LIMIT = 24000 * 3;    // 3 seconds of silence -> Sleep

  constructor() {
    super();
    this.port.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(event: MessageEvent) {
    const { type, payload } = event.data;

    if (type === 'INIT') {
      const { sabAudio, sabPointers, size } = payload;
      
      this.audioBuffer = new Float32Array(sabAudio);
      // Pointers: [0] = WriteIndex, [1] = ReadIndex
      const pointersView = new Int32Array(sabPointers);
      this.writeIndexPtr = new Int32Array(sabPointers, 0, 1);
      this.readIndexPtr = new Int32Array(sabPointers, 4, 1);
      
      this.bufferSize = size;
      this.mask = size - 1; // Requires Power of 2!
      this.initialized = true;
      
      console.log(`[AudioWorklet] Initialized with buffer size ${size}`);
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    if (!this.initialized || !this.audioBuffer || !this.writeIndexPtr || !this.readIndexPtr) {
      return true; // Keep alive until initialized
    }

    const outputChannel = outputs[0][0];
    const outputLength = outputChannel.length;

    // 1. Thread-Safe Pointer Load
    const writeIndex = Atomics.load(this.writeIndexPtr, 0);
    
    // 2. Calculate Fill Level (Distance)
    let fillLevel = (writeIndex - Math.floor(this.localReadIndex));
    if (fillLevel < 0) fillLevel += 0; // Handle wrap logic if strictly needed

    // --- HYBRID VELOCITY LOGIC (SLEW 2.0) ---
    // Goal: Be mostly passive (1.0x) unless extreme backlog (>10s)
    
    let targetSpeed = 1.0;
    let diff = fillLevel - this.TARGET_LATENCY_FRAMES;

    // Har vi för mycket data?
    if (diff > 0) {
        if (diff > this.HIGH_LATENCY_THRESHOLD) {
            // RED ZONE (>25s): Max tillåten speedup (1.03x)
            // Detta hjälper att dränera bufferten i samarbete med DPI (Rocket Mode)
            targetSpeed = 1.03;
        } else {
            // GREEN/YELLOW ZONE (<25s): Minimal speedup.
            // Vi vill undvika att bufferten växer, men vi vill INTE höra det.
            // Linear ramp from 1.00 -> 1.01 max.
            const ratio = diff / this.HIGH_LATENCY_THRESHOLD; // 0.0 to 1.0
            targetSpeed = 1.0 + (ratio * 0.01);
        }
    }

    // Applicera glidningen mot målet (Slew Rate Limiting)
    if (Math.abs(this.currentSpeed - targetSpeed) > 0.0001) {
        this.currentSpeed += (targetSpeed - this.currentSpeed) * this.BASE_SLEW;
    } else {
        this.currentSpeed = targetSpeed;
    }

    // Rapportera status (~10Hz)
    this.framesSinceLastReport += outputLength;
    if (this.framesSinceLastReport > 2400) { 
        this.port.postMessage({
            type: 'STATUS',
            samples: fillLevel,
            ms: (fillLevel / this.SAMPLE_RATE) * 1000,
            speed: this.currentSpeed // Skicka med hastigheten till UI
        });
        this.framesSinceLastReport = 0;
    }

    // --- ANTI-CLICK (GAIN) ---
    // Om vi har mindre än 128 samples (ca 5ms) kvar, börja fejda ut.
    if (fillLevel < 128) {
      this.targetGain = 0.0;
    } else {
      this.targetGain = 1.0;
    }

    let sumSq = 0;

    // 5. Render Loop (Per Sample)
    for (let i = 0; i < outputLength; i++) {
      // Update Gain (Exponential Smoothing)
      if (Math.abs(this.currentGain - this.targetGain) > 0.001) {
        const factor = this.targetGain > this.currentGain ? this.GAIN_ATTACK : this.GAIN_DECAY;
        this.currentGain += (this.targetGain - this.currentGain) * factor;
      } else {
        this.currentGain = this.targetGain;
      }

      if (this.currentGain > 0.001) {
        // Linear Interpolation
        const idx0 = Math.floor(this.localReadIndex);
        const idx1 = idx0 + 1;
        const fraction = this.localReadIndex - idx0;

        const y0 = this.audioBuffer[idx0 & this.mask];
        const y1 = this.audioBuffer[idx1 & this.mask];

        const interpolated = y0 + (y1 - y0) * fraction;
        
        const val = interpolated * this.currentGain;
        outputChannel[i] = val;
        
        sumSq += val * val;

        // Advance Ptr using the SLEWED speed
        this.localReadIndex += this.currentSpeed;

      } else {
        outputChannel[i] = 0.0;
      }
    }

    // RMS Calculation for Silence Detection
    const rms = Math.sqrt(sumSq / outputLength);
    this.checkSilence(rms, outputLength);

    // 6. Thread-Safe Pointer Store
    Atomics.store(this.readIndexPtr, 0, Math.floor(this.localReadIndex));

    return true;
  }

  private checkSilence(rms: number, length: number) {
      if (rms < this.SILENCE_THRESHOLD) {
          this.silenceCounter += length;
      } else {
          if (this.isSilent) {
              this.isSilent = false;
              this.port.postMessage({ type: 'VOICE_START' });
          }
          this.silenceCounter = 0;
      }

      if (!this.isSilent && this.silenceCounter > this.IDLE_LIMIT) {
          this.isSilent = true;
          this.port.postMessage({ type: 'VOICE_STOP' });
      }
  }
}

registerProcessor('audio-processor', AudioProcessor);