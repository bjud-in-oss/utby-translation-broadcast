export type QuotaLevel = "normal" | "warning_yellow" | "warning_red" | "hard_stop";

export const YELLOW_WARNING_THRESHOLD = 6000;
export const RED_WARNING_THRESHOLD = 8000;
export const HARD_STOP_THRESHOLD = 9000;
export const MONTHLY_MAX_FREE_LIMIT = 10000;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export class InMemoryStorage implements StorageLike {
  private map = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  public removeItem(key: string): void {
    this.map.delete(key);
  }
}

export function calculateSecondConsumption(interpreterTracks: number, listeners: number): number {
  const safeTracks = Math.max(0, interpreterTracks);
  const safeListeners = Math.max(0, listeners);
  return (1 + safeTracks) * safeListeners * (1 / 60);
}

export function getQuotaStorageKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `quota_usage_${year}_${month}`;
}

export class QuotaService {
  private storage: StorageLike;
  public onHardStop?: () => void;
  public onQuotaChange?: (usage: number, level: QuotaLevel) => void;

  constructor(customStorage?: StorageLike) {
    if (customStorage) {
      this.storage = customStorage;
    } else if (typeof window !== "undefined" && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = new InMemoryStorage();
    }
  }

  public getMonthlyUsage(date: Date = new Date()): number {
    const key = getQuotaStorageKey(date);
    const raw = this.storage.getItem(key);
    if (!raw) return 0;
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  public recordUsage(trackMinutes: number, date: Date = new Date()): number {
    const current = this.getMonthlyUsage(date);
    const updated = Math.max(0, current + trackMinutes);
    const key = getQuotaStorageKey(date);
    this.storage.setItem(key, updated.toString());

    const level = this.getQuotaLevel(updated);
    this.onQuotaChange?.(updated, level);

    if (level === "hard_stop") {
      this.onHardStop?.();
    }
    return updated;
  }

  public addSecondUsage(
    interpreterTracks: number,
    listeners: number,
    date: Date = new Date()
  ): { usage: number; level: QuotaLevel; stopped: boolean } {
    const secUsage = calculateSecondConsumption(interpreterTracks, listeners);
    const updated = this.recordUsage(secUsage, date);
    const level = this.getQuotaLevel(updated);
    return {
      usage: updated,
      level,
      stopped: level === "hard_stop",
    };
  }

  public getQuotaLevel(usage?: number): QuotaLevel {
    const value = usage !== undefined ? usage : this.getMonthlyUsage();
    if (value >= HARD_STOP_THRESHOLD) return "hard_stop";
    if (value >= RED_WARNING_THRESHOLD) return "warning_red";
    if (value >= YELLOW_WARNING_THRESHOLD) return "warning_yellow";
    return "normal";
  }

  public isHardStop(usage?: number): boolean {
    const value = usage !== undefined ? usage : this.getMonthlyUsage();
    return value >= HARD_STOP_THRESHOLD;
  }

  public resetUsage(date: Date = new Date()): void {
    const key = getQuotaStorageKey(date);
    if (this.storage.removeItem) {
      this.storage.removeItem(key);
    } else {
      this.storage.setItem(key, "0");
    }
    this.onQuotaChange?.(0, "normal");
  }
}

export const quotaService = new QuotaService();
