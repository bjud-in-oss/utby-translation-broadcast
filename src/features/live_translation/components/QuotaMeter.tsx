import { QuotaLevel } from "../domain/quotaService";

export interface QuotaMeterProps {
  usage: number;
  quotaLevel: QuotaLevel;
  isHardStopped: boolean;
  interpreterTracksDisabled: boolean;
  onToggleInterpreterTracks: () => void;
  listenersCount: number;
}

export function QuotaMeter({
  usage,
  quotaLevel,
  isHardStopped,
  interpreterTracksDisabled,
  onToggleInterpreterTracks,
  listenersCount,
}: QuotaMeterProps) {
  const percentage = Math.min(100, Math.round((usage / 9000) * 100));
  const roundedUsage = Math.round(usage * 10) / 10;

  const getStatusColor = () => {
    switch (quotaLevel) {
      case "hard_stop":
        return "text-rose-800 bg-rose-100 border-rose-300";
      case "warning_red":
        return "text-rose-700 bg-rose-50 border-rose-200";
      case "warning_yellow":
        return "text-amber-800 bg-amber-50 border-amber-200";
      default:
        return "text-stone-700 bg-stone-100 border-stone-200";
    }
  };

  const getProgressColor = () => {
    switch (quotaLevel) {
      case "hard_stop":
        return "bg-rose-700";
      case "warning_red":
        return "bg-rose-600";
      case "warning_yellow":
        return "bg-amber-500";
      default:
        return "bg-[#5e6ef2]";
    }
  };

  return (
    <div id="quota-meter-card" className="p-4 bg-stone-50/80 border border-stone-200 rounded-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-mono text-[0.7rem] uppercase tracking-wider text-stone-600 font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>
          Spårkvot (Gratisnivå)
        </span>
        <span id="quota-status-pill" className={`font-mono text-[0.65rem] px-2 py-0.5 border font-semibold ${getStatusColor()}`} style={{ fontFamily: "'Space Mono', monospace" }}>
          {quotaLevel === "hard_stop" ? "HÅRT STOPP (9 000m)" : quotaLevel === "warning_red" ? "KRITISK (8 000m)" : quotaLevel === "warning_yellow" ? "GUL VARNING (6 000m)" : "NORMAL"}
        </span>
      </div>

      <div className="flex justify-between items-baseline mb-1">
        <span className="font-mono text-xs text-stone-900 font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>
          {roundedUsage} / 9 000 min
        </span>
        <span className="font-mono text-[0.7rem] text-stone-500" style={{ fontFamily: "'Space Mono', monospace" }}>
          {percentage}% ({listenersCount} lyssnare)
        </span>
      </div>

      <div id="quota-progress-bar" className="h-1.5 bg-stone-200 rounded-full overflow-hidden mb-3">
        <div
          id="quota-progress-fill"
          className={`h-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {quotaLevel === "warning_yellow" && (
        <div id="quota-yellow-actions" className="pt-1 flex items-center justify-between">
          <p className="text-xs text-amber-900 font-sans">
            Kvotvarning: spara spårminuter genom att stänga av tolkspår.
          </p>
          <button
            id="toggle-interpreter-tracks-btn"
            type="button"
            onClick={onToggleInterpreterTracks}
            className="ml-2 py-1 px-2.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-mono text-[0.7rem] border border-amber-300 cursor-pointer transition-colors"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            {interpreterTracksDisabled ? "Återaktivera tolkspår" : "Koppla från tolkspår"}
          </button>
        </div>
      )}

      {quotaLevel === "warning_red" && (
        <div id="quota-red-actions" className="pt-1 flex items-center justify-between">
          <p className="text-xs text-rose-900 font-sans">
            Kritisk nivå (&gt;8 000 min)! Automatisk spärr aktiveras vid 9 000 min.
          </p>
          <button
            id="toggle-interpreter-tracks-btn"
            type="button"
            onClick={onToggleInterpreterTracks}
            className="ml-2 py-1 px-2.5 bg-rose-200 hover:bg-rose-300 text-rose-950 font-mono text-[0.7rem] border border-rose-300 cursor-pointer transition-colors"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            {interpreterTracksDisabled ? "Återaktivera tolkspår" : "Koppla från tolkspår"}
          </button>
        </div>
      )}

      {isHardStopped && (
        <div id="quota-hard-stop-banner" className="mt-2 p-2 bg-rose-100 border border-rose-300 text-rose-900 text-xs font-semibold">
          ⛔ Sändningen har stängts av automatiskt. Kvottaket på 9 000 spårminuter har uppnåtts för att garantera gratis drift.
        </div>
      )}
    </div>
  );
}
