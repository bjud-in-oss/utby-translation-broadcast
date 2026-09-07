import { LiveKitTokenRequest, TokenResponse } from "./types";
import { LiveKitTokenRequestSchema } from "./schema";

/**
 * TokenService
 * Klientkontrakt för att begära och hantera LiveKit åtkomsttokens.
 */
export class TokenService {
  /**
   * Validerar begäran om token mot Zod-schemat.
   */
  public static validateRequest(request: LiveKitTokenRequest): boolean {
    const result = LiveKitTokenRequestSchema.safeParse(request);
    return result.success;
  }

  /**
   * Beräknar tidsstämplar med 5 sekunders klock-skew buffert.
   */
  public static getSkewAdjustedTimestamps(ttlSeconds: number = 900): {
    notBefore: number;
    expiresAt: number;
  } {
    const nowSeconds = Math.floor(Date.now() / 1000);
    return {
      notBefore: nowSeconds - 5,
      expiresAt: nowSeconds + ttlSeconds,
    };
  }

  /**
   * Returnerar standardiserad tokenrespons för anslutningsläge.
   */
  public static createEphemeralToken(
    identity: string,
    room: string
  ): TokenResponse {
    const { expiresAt } = this.getSkewAdjustedTimestamps(900);
    const token = `mock_token_${encodeURIComponent(identity)}_${encodeURIComponent(room)}_${expiresAt}`;
    return {
      token,
      expiresAt,
    };
  }
}
