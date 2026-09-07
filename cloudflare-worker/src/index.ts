/**
 * Cloudflare Worker: REST-proxy för SDP-signalering mot Cloudflare Calls API.
 * 
 * Arkitekturrestriktioner:
 * - Hanterar enbart REST API och SDP offer/answer-utbyte för Cloudflare Calls.
 * - Ingen mediebroms, ljudbehandling eller WebSocket-strömning körs i Workern
 *   p.g.a. Cloudflare V8-isolatets CPU-begränsningar. All ljudbearbetning sker
 *   hos klienten via Web Audio / AudioWorklet.
 */

export interface Env {
  CLOUDFLARE_CALLS_APP_ID: string;
  CLOUDFLARE_CALLS_APP_TOKEN: string;
}

const CLOUDFLARE_CALLS_BASE_URL = 'https://rtc.live.cloudflare.com/v1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Hantera CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Endast POST är tillåtet för signalering
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method Not Allowed' }, 405);
    }

    const appId = env.CLOUDFLARE_CALLS_APP_ID;
    const appToken = env.CLOUDFLARE_CALLS_APP_TOKEN;

    if (!appId || !appToken) {
      return jsonResponse(
        { error: 'Serverkonfiguration saknas: CLOUDFLARE_CALLS_APP_ID eller CLOUDFLARE_CALLS_APP_TOKEN saknas' },
        500
      );
    }

    // 1. Skapa en ny WebRTC-session
    // POST /api/sfu/session/new
    if (url.pathname === '/api/sfu/session/new') {
      let body: {
        sessionDescription?: { type: string; sdp: string };
      };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'Ogiltig JSON i begäran' }, 400);
      }

      if (!body || !body.sessionDescription) {
        return jsonResponse({ error: 'sessionDescription krävs' }, 400);
      }

      try {
        const cfUrl = `${CLOUDFLARE_CALLS_BASE_URL}/apps/${appId}/sessions/new`;
        const cfResponse = await fetch(cfUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionDescription: body.sessionDescription,
          }),
        });

        const data = await cfResponse.json();
        return jsonResponse(data, cfResponse.status);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internt serverfel vid sessionsskapande';
        return jsonResponse({ error: message }, 500);
      }
    }

    // 2. Lägg till lokala eller fjärranslutna ljudspår
    // POST /api/sfu/tracks/new
    if (url.pathname === '/api/sfu/tracks/new') {
      let body: {
        sessionId?: string;
        sessionDescription?: { type: string; sdp: string };
        tracks?: Array<unknown>;
      };
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'Ogiltig JSON i begäran' }, 400);
      }

      const sessionId = body?.sessionId || url.searchParams.get('sessionId');

      if (!sessionId) {
        return jsonResponse({ error: 'sessionId krävs i request body eller query parameter' }, 400);
      }

      if (!body || !body.sessionDescription) {
        return jsonResponse({ error: 'sessionDescription krävs' }, 400);
      }

      if (!body.tracks || !Array.isArray(body.tracks) || body.tracks.length === 0) {
        return jsonResponse({ error: 'tracks array krävs och får inte vara tom' }, 400);
      }

      try {
        const cfUrl = `${CLOUDFLARE_CALLS_BASE_URL}/apps/${appId}/sessions/${sessionId}/tracks/new`;
        const cfResponse = await fetch(cfUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${appToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionDescription: body.sessionDescription,
            tracks: body.tracks,
          }),
        });

        const data = await cfResponse.json();
        return jsonResponse(data, cfResponse.status);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internt serverfel vid hantering av spår';
        return jsonResponse({ error: message }, 500);
      }
    }

    return jsonResponse({ error: 'Not Found' }, 404);
  },
};
