import { useLiveTranslation } from "../hooks/useLiveTranslation";
import { SupportedLanguage } from "../domain/types";
import { ALL_LANGUAGES, LANGUAGE_REGIONS } from "../domain/languages";

export function LiveTranslationWidget() {
  const {
    status,
    targetLanguage,
    audioLevel,
    audioDevices,
    selectedDeviceId,
    error,
    isRotating,
    setSelectedDeviceId,
    setTargetLanguage,
    startTranslation,
    stopTranslation,
    panicMute,
  } = useLiveTranslation();

  const isLive = status === "active" || status === "rotating";

  return (
    <div id="live-translation-container" className="p-6 bg-stone-50 rounded-xl border border-stone-200 shadow-sm max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 id="translation-title" className="text-lg font-medium text-stone-900">Realtidstolkning</h2>
        <span
          id="status-badge"
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isLive ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"
          }`}
        >
          {status}
        </span>
      </div>

      {isRotating && (
        <div id="hot-swap-banner" className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          Hot-swap aktiv: sömlös överlämning pågår...
        </div>
      )}

      {error && (
        <div id="error-banner" className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="audio-device-select" className="block text-xs font-medium text-stone-600 mb-1">
            Ljudingång (mikrofon / NDI)
          </label>
          <select
            id="audio-device-select"
            aria-label="Välj ljudingång"
            value={selectedDeviceId}
            disabled={isLive}
            onChange={(e) => setSelectedDeviceId?.(e.target.value)}
            className="w-full bg-white border border-stone-300 rounded-md px-3 py-2 text-sm text-stone-800 focus:ring-1 focus:ring-stone-400 disabled:opacity-50 truncate"
          >
            {(audioDevices ?? []).map((dev) => (
              <option key={dev.deviceId} value={dev.deviceId}>
                {dev.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="target-lang-select" className="block text-xs font-medium text-stone-600 mb-1">
            Målspråk
          </label>
          <select
            id="target-lang-select"
            aria-label="Välj målspråk"
            value={targetLanguage}
            disabled={isLive}
            onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
            className="w-full bg-white border border-stone-300 rounded-md px-3 py-2 text-sm text-stone-800 focus:ring-1 focus:ring-stone-400 disabled:opacity-50"
          >
            {LANGUAGE_REGIONS.map((region) => (
              <optgroup key={region} label={region}>
                {ALL_LANGUAGES.filter((l) => l.region === region).map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name} ({lang.code})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between text-xs text-stone-500 mb-1">
            <span>Ljudvolym</span>
            <span>{audioLevel}%</span>
          </div>
          <div id="audio-level-meter" className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
            <div
              id="audio-level-fill"
              className="bg-emerald-500 h-full transition-all duration-75"
              style={{ width: `${audioLevel}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            id="toggle-translation-btn"
            type="button"
            onClick={isLive ? stopTranslation : () => void startTranslation()}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isLive ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-stone-900 hover:bg-stone-800 text-white"
            }`}
          >
            {isLive ? "Avsluta tolkning" : "Starta tolkning"}
          </button>

          <button
            id="panic-mute-btn"
            type="button"
            onClick={panicMute}
            className="py-2 px-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md text-xs font-medium"
          >
            Panik-tystning
          </button>
        </div>
      </div>
    </div>
  );
}
