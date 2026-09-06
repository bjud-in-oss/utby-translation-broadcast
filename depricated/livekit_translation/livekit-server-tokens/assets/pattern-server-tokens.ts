import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { roomName, identity, role = 'listener' } = await req.json();

    if (!roomName || !identity) {
      return NextResponse.json({ error: 'roomName och identity krävs' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Serverkonfiguration saknas' }, { status: 500 });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: '15m', // 15 minuters giltighetstid
    });

    // Clock skew-buffert (nbf 5s i dåtid)
    (at as any).nbf = Math.floor(Date.now() / 1000) - 5;

    const isPublisher = role === 'broadcaster' || role === 'translator';
    const isHidden = role === 'translator';

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: isPublisher,
      canSubscribe: true,
      canPublishData: true,
      hidden: isHidden,
    });

    // SDK v2 kräver await
    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Token creation failed', details: err.message }, { status: 500 });
  }
}
