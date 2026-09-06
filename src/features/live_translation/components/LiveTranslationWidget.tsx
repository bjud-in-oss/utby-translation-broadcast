import { useLiveTranslation } from "../hooks/useLiveTranslation";
import { SupportedLanguage } from "../domain/types";
import { ALL_LANGUAGES, LANGUAGE_REGIONS } from "../domain/languages";

export function LiveTranslationWidget() {
  const {
    status, targetLanguage, audioLevel, audioDevices, selectedDeviceId,
    error, configWarning, isRotating, setSelectedDeviceId, setTargetLanguage,
    unlockAudioContext, startTranslation, stopTranslation, panicMute,
  } = useLiveTranslation();

  const isLive = status === "active" || status === "rotating";
  const handleToggle = () => {
    if (isLive) {
      stopTranslation();
    } else {
      unlockAudioContext?.();
      void startTranslation();
    }
  };

  return (
    <div id="live-translation-container" className="relative bg-white p-8 sm:p-12 rounded-sm shadow-[0_40px_100px_rgba(0,0,0,0.04)] border border-stone-200/70 overflow-hidden w-full max-w-lg">
      <div className="absolute -bottom-20 -right-6 text-[16rem] font-serif italic text-stone-900/[0.03] select-none pointer-events-none" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>G</div>
      <div className="flex justify-between items-baseline mb-6 pb-4 border-b border-stone-900/[0.08]">
        <h2 id="translation-title" className="text-3xl font-semibold tracking-tight text-stone-900" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Realtidstolkning</h2>
        <span id="status-badge" className="font-mono text-xs font-bold uppercase tracking-wider text-[#5e6ef2]" style={{ fontFamily: "'Space Mono', monospace" }}>{status}</span>
      </div>

      {configWarning && (
        <div id="config-warning-banner" className="mb-4 p-2.5 bg-amber-50 border border-amber-200 font-mono text-[0.7rem] text-amber-900">⚠️ {configWarning}</div>
      )}
      {isRotating && (
        <div id="hot-swap-banner" className="mb-4 p-2.5 bg-amber-50/80 border border-amber-200 font-mono text-xs text-amber-900">Hot-swap aktiv: sömlös överlämning pågår...</div>
      )}
      {error && (
        <div id="error-banner" className="mb-4 p-2.5 bg-rose-50/80 border border-rose-200 font-mono text-xs text-rose-800">{error}</div>
      )}

      <div className="space-y-6">
        <div>
          <label htmlFor="audio-device-select" className="block font-mono text-[0.7rem] uppercase tracking-widest text-stone-900/50 mb-1.5" style={{ fontFamily: "'Space Mono', monospace" }}>Ljudingång (mikrofon / NDI)</label>
          <select
            id="audio-device-select" aria-label="Välj ljudingång" value={selectedDeviceId} disabled={isLive}
            onChange={(e) => setSelectedDeviceId?.(e.target.value)}
            className="w-full bg-transparent border-0 border-b-2 border-stone-900 py-2 text-base text-stone-900 outline-none cursor-pointer focus:border-[#5e6ef2] disabled:opacity-40 transition-colors"
          >
            {(audioDevices ?? []).map((dev) => (<option key={dev.deviceId} value={dev.deviceId}>{dev.label}</option>))}
          </select>
        </div>

        <div>
          <label htmlFor="target-lang-select" className="block font-mono text-[0.7rem] uppercase tracking-widest text-stone-900/50 mb-1.5" style={{ fontFamily: "'Space Mono', monospace" }}>Målspråk</label>
          <select
            id="target-lang-select" aria-label="Välj målspråk" value={targetLanguage} disabled={isLive}
            onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
            className="w-full bg-transparent border-0 border-b-2 border-stone-900 py-2 text-base text-stone-900 outline-none cursor-pointer focus:border-[#5e6ef2] disabled:opacity-40 transition-colors"
          >
            {LANGUAGE_REGIONS.map((region) => (
              <optgroup key={region} label={region}>
                {ALL_LANGUAGES.filter((l) => l.region === region).map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.flag} {lang.name} ({lang.code})</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-1.5">
            <label className="font-mono text-[0.7rem] uppercase tracking-widest text-stone-900/50" style={{ fontFamily: "'Space Mono', monospace" }}>Ljudvolym</label>
            <span className="font-mono text-xs text-stone-900 font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>{audioLevel}%</span>
          </div>
          <div id="audio-level-meter" className="h-1 bg-stone-900/[0.08] rounded-full overflow-hidden">
            <div id="audio-level-fill" className="h-full bg-stone-900 transition-all duration-75" style={{ width: `${audioLevel}%` }} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            id="toggle-translation-btn" type="button" onClick={handleToggle}
            className={`flex-1 py-3.5 px-6 text-sm font-semibold tracking-wider transition-colors duration-200 cursor-pointer ${
              isLive ? "bg-rose-700 hover:bg-rose-800 text-white" : "bg-[#1a1a1a] hover:bg-[#5e6ef2] text-[#f8f7f4]"
            }`}
          >
            {isLive ? "Avsluta tolkning" : "Starta tolkning"}
          </button>
          <button
            id="panic-mute-btn" type="button" onClick={panicMute}
            className="py-3.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-mono text-xs tracking-wider cursor-pointer border border-stone-300/80 transition-colors"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Panik-tystning
          </button>
        </div>
      </div>
    </div>
  );
}
