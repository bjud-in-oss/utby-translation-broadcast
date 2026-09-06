import { TranslationBridge } from "./translationBridge";
import { SupportedLanguage } from "./types";

export interface MultiBridgeCallbacks {
  onAudioData: (lang: SupportedLanguage, samples: Int16Array) => void;
  onStatusChange: (
    lang: SupportedLanguage,
    status: "idle" | "connecting" | "active" | "rotating" | "error"
  ) => void;
  onError: (lang: SupportedLanguage, error: string) => void;
}

/**
 * MultiBridgeOrchestrator
 * Administrerar parallella TranslationBridge-instanser för multipla språk i realtid.
 * Varje instans motsvarar en virtuell tolk under identiteten "translator-[språkkod]".
 */
export class MultiBridgeOrchestrator {
  private readonly bridges = new Map<SupportedLanguage, TranslationBridge>();
  private readonly statuses = new Map<
    SupportedLanguage,
    "idle" | "connecting" | "active" | "rotating" | "error"
  >();

  constructor(
    private readonly apiKey: string,
    private readonly callbacks: MultiBridgeCallbacks
  ) {}

  public startLanguage(lang: SupportedLanguage): void {
    if (this.bridges.has(lang)) {
      return;
    }

    const bridge = new TranslationBridge(this.apiKey, lang, {
      onAudioData: (samples) => {
        this.callbacks.onAudioData(lang, samples);
      },
      onStatusChange: (status) => {
        this.statuses.set(lang, status);
        this.callbacks.onStatusChange(lang, status);
      },
      onError: (error) => {
        this.callbacks.onError(lang, error);
      },
    });

    this.bridges.set(lang, bridge);
    bridge.connect();
  }

  public stopLanguage(lang: SupportedLanguage): void {
    const bridge = this.bridges.get(lang);
    if (bridge) {
      bridge.disconnect();
      this.bridges.delete(lang);
      this.statuses.delete(lang);
      this.callbacks.onStatusChange(lang, "idle");
    }
  }

  public broadcastAudio(samples: Int16Array): void {
    for (const bridge of this.bridges.values()) {
      bridge.sendAudioChunk(samples);
    }
  }

  public stopAll(): void {
    for (const [lang, bridge] of this.bridges.entries()) {
      bridge.disconnect();
      this.callbacks.onStatusChange(lang, "idle");
    }
    this.bridges.clear();
    this.statuses.clear();
  }

  public getActiveLanguages(): SupportedLanguage[] {
    return Array.from(this.bridges.keys());
  }

  public isLanguageActive(lang: SupportedLanguage): boolean {
    return this.bridges.has(lang);
  }

  public getLanguageStatus(
    lang: SupportedLanguage
  ): "idle" | "connecting" | "active" | "rotating" | "error" {
    return this.statuses.get(lang) ?? "idle";
  }
}
