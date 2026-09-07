import { useState, useCallback, useRef, useEffect } from "react";
import { SupportedLanguage, SessionStatus, AudioInputDevice } from "../domain/types";
import { MultiBridgeOrchestrator } from "../domain/multiBridgeOrchestrator";
import { CloudflareSFUAdapter } from "../domain/CloudflareSFUAdapter";
import { LocalWebSocketAdapter } from "../domain/LocalWebSocketAdapter";

export type TransportMode = "sfu" | "local_ws";

export function useLiveTranslation() {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>("sv");
  const [activeLanguages, setActiveLanguages] = useState<SupportedLanguage[]>(["sv"]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [configWarning, setConfigWarning] = useState<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<AudioInputDevice[]>([
    { deviceId: "default", label: "Standardmikrofon" },
  ]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("default");
  const [transportMode, setTransportModeState] = useState<TransportMode>("sfu");

  const orchestratorRef = useRef<MultiBridgeOrchestrator | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sfuAdapterRef = useRef<CloudflareSFUAdapter | null>(null);
  const localWsAdapterRef = useRef<LocalWebSocketAdapter | null>(null);
  const micWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    const getEnv = (key: string): string | undefined => {
      if (typeof import.meta !== "undefined" && (import.meta as unknown as { env: Record<string, string> }).env) {
        return (import.meta as unknown as { env: Record<string, string> }).env[key] ||
          (import.meta as unknown as { env: Record<string, string> }).env[`VITE_${key}`];
      }
      if (typeof process !== "undefined" && process.env) {
        return process.env[key] || process.env[`VITE_${key}`];
      }
      return undefined;
    };
    const missing: string[] = [];
    if (!getEnv("GEMINI_API_KEY")) missing.push("GEMINI_API_KEY");
    if (missing.length > 0) setConfigWarning(`Saknade miljövariabler: ${missing.join(", ")}`);
  }, []);

  const refreshAudioDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((d) => d.kind === "audioinput")
        .map((d, index) => ({
          deviceId: d.deviceId || `device-${index}`,
          label: d.label || (d.deviceId === "default" ? "Standardmikrofon" : `Ljudenhet ${index + 1}`),
        }));
      if (audioInputs.length > 0) {
        setAudioDevices(audioInputs);
        if (!selectedDeviceId || selectedDeviceId === "default") {
          setSelectedDeviceId(audioInputs[0]?.deviceId ?? "default");
        }
      }
    } catch (e) { console.warn("Kunde inte hämta ljudenheter:", e); }
  }, [selectedDeviceId]);

  useEffect(() => {
    void refreshAudioDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshAudioDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshAudioDevices);
    };
  }, [refreshAudioDevices]);

  const unlockAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        const AudioCtx = window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) audioContextRef.current = new AudioCtx({ sampleRate: 48000 });
      }
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        void audioContextRef.current.resume();
      }
    } catch (e) { console.warn("Kunde inte initiera AudioContext:", e); }
  }, []);

  const disconnectTransports = useCallback(() => {
    if (sfuAdapterRef.current) { sfuAdapterRef.current.disconnect(); sfuAdapterRef.current = null; }
    if (localWsAdapterRef.current) { localWsAdapterRef.current.disconnect(); localWsAdapterRef.current = null; }
  }, []);

  const setTransportMode = useCallback((mode: TransportMode) => {
    if (mode !== transportMode) {
      disconnectTransports();
      setTransportModeState(mode);
    }
  }, [transportMode, disconnectTransports]);

  const toggleActiveLanguage = useCallback((lang: SupportedLanguage) => {
    setActiveLanguages((prev) => {
      const exists = prev.includes(lang);
      const next = exists ? prev.filter((l) => l !== lang) : [...prev, lang];
      return next.length === 0 ? [lang] : next;
    });
  }, []);

  const panicMute = useCallback(() => {
    try {
      disconnectTransports();
      if (micWorkletNodeRef.current) { micWorkletNodeRef.current.disconnect(); micWorkletNodeRef.current = null; }
      if (sourceNodeRef.current) { sourceNodeRef.current.disconnect(); sourceNodeRef.current = null; }
      if (orchestratorRef.current) { orchestratorRef.current.stopAll(); orchestratorRef.current = null; }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch (e) { console.warn("Fel vid panik-tystning:", e); }
    setAudioLevel(0);
    setStatus("idle");
    setError(null);
  }, [disconnectTransports]);

  const stopTranslation = useCallback(() => { panicMute(); }, [panicMute]);

  const startTranslation = useCallback(async () => {
    unlockAudioContext();
    setError(null);
    setStatus("connecting");

    const apiKey = (typeof process !== "undefined" && process.env.GEMINI_API_KEY) ||
      (typeof import.meta !== "undefined" &&
        (import.meta as unknown as { env: Record<string, string> }).env?.VITE_GEMINI_API_KEY) || "demo_key";

    try {
      const audioCtx = audioContextRef.current!;
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 48000,
      };
      if (selectedDeviceId && selectedDeviceId !== "default") {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      mediaStreamRef.current = stream;
      void refreshAudioDevices();

      const orchestrator = new MultiBridgeOrchestrator(apiKey, {
        onAudioData: (lang, samples) => {
          if (lang === targetLanguage) {
            let sum = 0;
            for (let i = 0; i < samples.length; i += 10) {
              const val = (samples[i] ?? 0) / 0x7fff;
              sum += val * val;
            }
            const rms = Math.sqrt(sum / (samples.length / 10));
            setAudioLevel(Math.min(100, Math.round(rms * 200)));
          }
        },
        onStatusChange: (_lang, newStatus) => { setStatus(newStatus); },
        onError: (_lang, err) => { setError(err); },
      });
      orchestratorRef.current = orchestrator;

      const languagesToStart = activeLanguages.length > 0 ? activeLanguages : [targetLanguage];
      for (const lang of languagesToStart) orchestrator.startLanguage(lang);

      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // Ersätt ScriptProcessorNode helt med MicCapture.worklet.ts
      const workletUrl = new URL("../workers/MicCapture.worklet.ts", import.meta.url);
      if (audioCtx.audioWorklet?.addModule) {
        try {
          await audioCtx.audioWorklet.addModule(workletUrl.href);
        } catch (workletErr) {
          console.warn("[Worklet] Kunde inte ladda MicCapture.worklet:", workletErr);
        }
      }

      const micTrack = stream.getAudioTracks()[0];
      if (transportMode === "sfu") {
        const sfu = new CloudflareSFUAdapter("broadcast-main");
        sfuAdapterRef.current = sfu;
        await sfu.connect();
        if (micTrack) await sfu.publishAudio(micTrack);
      } else if (transportMode === "local_ws") {
        const localWs = new LocalWebSocketAdapter(undefined, audioCtx);
        localWsAdapterRef.current = localWs;
        await localWs.connect();
        if (micTrack) await localWs.publishAudio(micTrack);
      }

      if (typeof AudioWorkletNode !== "undefined") {
        const workletNode = new AudioWorkletNode(audioCtx, "mic-capture-processor");
        micWorkletNodeRef.current = workletNode;
        workletNode.port.onmessage = (event: { data: ArrayBuffer }) => {
          if (event.data instanceof ArrayBuffer) {
            const pcm16 = new Int16Array(event.data);
            orchestrator.broadcastAudio(pcm16);
          }
        };
        source.connect(workletNode);
      }
    } catch (err) {
      console.warn("Kunde inte starta tolkström:", err);
      setError(err instanceof Error ? err.message : "Mikrofonåtkomst nekad");
      setStatus("error");
    }
  }, [selectedDeviceId, targetLanguage, activeLanguages, refreshAudioDevices, unlockAudioContext, transportMode]);

  return {
    status,
    targetLanguage,
    activeLanguages,
    audioLevel,
    audioDevices,
    selectedDeviceId,
    transportMode,
    error,
    configWarning,
    isRotating: status === "rotating",
    sfuAdapter: sfuAdapterRef.current,
    localWsAdapter: localWsAdapterRef.current,
    setSelectedDeviceId,
    setTransportMode,
    toggleActiveLanguage,
    setTargetLanguage,
    unlockAudioContext,
    startTranslation,
    stopTranslation,
    panicMute,
  };
}
