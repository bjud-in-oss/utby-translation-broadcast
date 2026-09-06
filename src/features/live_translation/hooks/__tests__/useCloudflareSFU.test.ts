import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCloudflareSFU, unlockAudio } from '../useCloudflareSFU';

describe('unlockAudio', () => {
  let originalAudioContext: typeof AudioContext;

  beforeEach(() => {
    originalAudioContext = window.AudioContext;
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    vi.restoreAllMocks();
  });

  it('spelar en tyst 0,1s buffer synkront för iOS Safari upplåsning', () => {
    const mockStart = vi.fn();
    const mockConnect = vi.fn();
    const mockCreateBuffer = vi.fn().mockReturnValue({});
    const mockCreateBufferSource = vi.fn().mockReturnValue({
      buffer: null,
      connect: mockConnect,
      start: mockStart,
    });
    const mockResume = vi.fn().mockResolvedValue(undefined);

    const MockAudioContext = vi.fn().mockImplementation(() => ({
      sampleRate: 48000,
      state: 'suspended',
      createBuffer: mockCreateBuffer,
      createBufferSource: mockCreateBufferSource,
      destination: {},
      resume: mockResume,
    }));

    window.AudioContext = MockAudioContext as unknown as typeof AudioContext;

    const ctx = unlockAudio();

    expect(MockAudioContext).toHaveBeenCalledTimes(1);
    // 48000 * 0.1 = 4800 samples
    expect(mockCreateBuffer).toHaveBeenCalledWith(1, 4800, 48000);
    expect(mockCreateBufferSource).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledWith(0);
    expect(mockResume).toHaveBeenCalled();
    expect(ctx).not.toBeNull();
  });
});

describe('useCloudflareSFU', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  class MockRTCPeerConnection {
    iceGatheringState = 'complete';
    signalingState = 'stable';
    iceConnectionState = 'connected';
    localDescription = { type: 'offer', sdp: 'v=0\r\no=mock-offer' };
    remoteDescription: any = null;
    ontrack: any = null;

    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    getTransceivers = vi.fn().mockReturnValue([]);
    addTransceiver = vi.fn().mockReturnValue({ mid: '0' });
    createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'v=0\r\no=mock-offer' });
    setLocalDescription = vi.fn().mockResolvedValue(undefined);
    setRemoteDescription = vi.fn().mockImplementation((desc) => {
      this.remoteDescription = desc;
      return Promise.resolve();
    });
    close = vi.fn().mockImplementation(() => {
      this.signalingState = 'closed';
    });
  }

  beforeEach(() => {
    (window as any).RTCPeerConnection = MockRTCPeerConnection;
    (window as any).RTCSessionDescription = vi.fn().mockImplementation((desc) => desc);

    mockFetch = vi.fn();
    window.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initieras i disconnected läge', () => {
    const { result } = renderHook(() => useCloudflareSFU('room-123'));
    expect(result.current.status).toBe('disconnected');
    expect(result.current.remoteStream).toBeNull();
  });

  it('ansluter via /api/sfu/session/new utan direkta Cloudflare-hemligheter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        sessionId: 'cf-session-456',
        sessionDescription: {
          type: 'answer',
          sdp: 'v=0\r\no=mock-answer',
        },
      }),
    });

    const { result } = renderHook(() => useCloudflareSFU('room-123'));

    await act(async () => {
      await result.current.connect();
    });

    // Kontrollera att anropet gick till den lokala /api/sfu/session/new proxyn
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('/api/sfu/session/new');
    expect(calledOptions.method).toBe('POST');
    // Verifiera att inga Authorization eller Cloudflare API-tokens exponeras i klienten
    expect(calledOptions.headers['Authorization']).toBeUndefined();
    expect(JSON.parse(calledOptions.body)).toEqual({
      sessionDescription: {
        type: 'offer',
        sdp: 'v=0\r\no=mock-offer',
      },
    });

    expect(result.current.status).toBe('connected');
  });

  it('publicerar ljud via /api/sfu/tracks/new', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessionId: 'cf-session-456',
          sessionDescription: { type: 'answer', sdp: 'v=0\r\no=answer' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessionDescription: { type: 'answer', sdp: 'v=0\r\no=track-answer' },
          tracks: [{ trackName: 'mock-track-id' }],
        }),
      });

    const { result } = renderHook(() => useCloudflareSFU('room-123'));

    await act(async () => {
      await result.current.connect();
    });

    const mockTrack = { id: 'mock-track-id', kind: 'audio' } as MediaStreamTrack;

    let publishedSessionId: string | null = null;
    await act(async () => {
      publishedSessionId = await result.current.publishAudio(mockTrack);
    });

    expect(publishedSessionId).toBe('cf-session-456');
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const [tracksUrl, tracksOptions] = mockFetch.mock.calls[1];
    expect(tracksUrl).toBe('/api/sfu/tracks/new');
    expect(tracksOptions.headers['Authorization']).toBeUndefined();
    const body = JSON.parse(tracksOptions.body);
    expect(body.sessionId).toBe('cf-session-456');
    expect(body.tracks[0]).toEqual({
      location: 'local',
      mid: '0',
      trackName: 'mock-track-id',
    });
  });

  it('prenumererar på fjärrspår via /api/sfu/tracks/new', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessionId: 'cf-session-456',
          sessionDescription: { type: 'answer', sdp: 'v=0\r\no=answer' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessionDescription: { type: 'answer', sdp: 'v=0\r\no=sub-answer' },
          tracks: [{ trackName: 'audio-es' }],
        }),
      });

    const { result } = renderHook(() => useCloudflareSFU('room-123'));

    await act(async () => {
      await result.current.connect();
    });

    await act(async () => {
      await result.current.subscribeToTrack('remote-session-999', 'audio-es');
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [subUrl, subOptions] = mockFetch.mock.calls[1];
    expect(subUrl).toBe('/api/sfu/tracks/new');
    expect(subOptions.headers['Authorization']).toBeUndefined();
    const body = JSON.parse(subOptions.body);
    expect(body.sessionId).toBe('cf-session-456');
    expect(body.tracks[0]).toEqual({
      location: 'remote',
      sessionId: 'remote-session-999',
      trackName: 'audio-es',
    });
  });

  it('kopplar ner korrekt vid disconnect()', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        sessionId: 'cf-session-456',
        sessionDescription: { type: 'answer', sdp: 'v=0\r\no=answer' },
      }),
    });

    const { result } = renderHook(() => useCloudflareSFU('room-123'));

    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.status).toBe('connected');

    act(() => {
      result.current.disconnect();
    });
    expect(result.current.status).toBe('disconnected');
  });
});
