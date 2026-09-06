// assets/pattern-ephemeral-tokens.ts
// Säkerhet: Generering av tids- och användningsbegränsade Ephemeral Tokens i backend

import type { Request, Response } from 'express';

export async function createLiveTranslateSessionToken(req: Request, res: Response) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY saknas på servern' });
  }

  const targetLang = req.body?.targetLang || 'sv';
  
  // Sätt giltighetstid, t.ex. 30 minuter framåt
  const expireDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/auth_tokens?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // KRAV: Begränsa användning till 1 anslutning och fast utgångstid
          uses: 1,
          expireTime: expireDate,
          liveConnectConstraints: {
            model: 'models/gemini-3.5-live-translate-preview',
            generationConfig: {
              responseModalities: ['AUDIO'],
              translationConfig: {
                targetLanguageCode: targetLang,
                echoTargetLanguage: false,
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Token creation failed', details: errText });
    }

    const data = await response.json();
    // Returnerar token-strängen (t.ex. data.name) till klienten
    return res.json({ token: data.name });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internt fel vid tokenskapande', message: err.message });
  }
}
