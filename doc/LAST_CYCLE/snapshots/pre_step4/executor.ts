/**
 * ZON 3: EXECUTOR (Validering & Tillståndsuppdatering)
 * Validerar AI-svar mot typstruktur eller schema innan app-state ändras.
 */
export interface AiPayload {
  reply: string;
  action?: string;
}

export function executeAiPayload(untrustedData: unknown): AiPayload {
  if (!untrustedData || typeof untrustedData !== 'object') {
    throw new Error('Invalid AI response format');
  }
  const data = untrustedData as Record<string, unknown>;
  return {
    reply: typeof data.reply === 'string' ? data.reply : '',
    action: typeof data.action === 'string' ? data.action : undefined,
  };
}
