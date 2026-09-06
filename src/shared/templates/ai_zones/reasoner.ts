/**
 * ZON 2: REASONER (Isolerat LLM-anrop)
 * Tar endast emot tvättad data från Zon 1.
 */
import { sanitizeInput } from './sanitizer';

export async function requestAiReasoning(rawText: string): Promise<unknown> {
  const cleanText = sanitizeInput(rawText);
  
  const response = await fetch('/api/assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: cleanText }),
  });

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}`);
  }

  return await response.json();
}
