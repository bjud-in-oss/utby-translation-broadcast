import { ResumptionState } from "./types";

/**
 * HotSwapManager
 * Hanterar proaktiv rotation och session resumption inför Gemini Live API:s 15-minutersgräns.
 */
export class HotSwapManager {
  private resumptionHandle: string | null = null;
  private rotationTimer: ReturnType<typeof setTimeout> | null = null;
  private rotationCount: number = 0;
  private readonly ROTATION_TIMEOUT_MS = 14 * 60 * 1000; // 14 minuter

  constructor(private readonly onRotateNeeded: (handle: string | null) => void) {}

  /**
   * Startar timern för proaktiv rotation.
   */
  public armTimer(): void {
    this.disarmTimer();
    this.rotationTimer = setTimeout(() => {
      this.rotationCount++;
      this.onRotateNeeded(this.resumptionHandle);
    }, this.ROTATION_TIMEOUT_MS);
  }

  /**
   * Avbryter aktiv rotationstimer.
   */
  public disarmTimer(): void {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  /**
   * Sparar sessionshandtaget från Gemini API (sessionResumptionUpdate).
   */
  public updateResumptionHandle(handle: string): void {
    this.resumptionHandle = handle;
  }

  /**
   * Hämtar aktuellt sessionshandtag.
   */
  public getResumptionHandle(): string | null {
    return this.resumptionHandle;
  }

  /**
   * Returnerar aktuellt resiliens-tillstånd.
   */
  public getState(): ResumptionState {
    return {
      handle: this.resumptionHandle,
      lastActiveTime: Date.now(),
      rotationCount: this.rotationCount,
    };
  }

  /**
   * Återställer all intern data och stänger timern.
   */
  public reset(): void {
    this.disarmTimer();
    this.resumptionHandle = null;
    this.rotationCount = 0;
  }
}
