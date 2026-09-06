import { Sparkles, Plus } from "lucide-react";
import { useExample } from "../hooks/useExample";

export function ExampleWidget() {
  const { data, handleIncrement } = useExample();

  return (
    <div className="p-6 rounded-2xl border border-stone-200 bg-stone-50/50 shadow-sm max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-800">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-stone-900">{data.title}</h2>
          <p className="text-xs text-stone-500">Mekanisk arkitektur och domänskivor</p>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-stone-200/80 mb-4">
        <span className="text-sm font-medium text-stone-600">Räknare</span>
        <span className="text-2xl font-semibold text-stone-900" data-testid="count-value">
          {data.count}
        </span>
      </div>

      <button
        onClick={handleIncrement}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        <span>Öka värde</span>
      </button>
    </div>
  );
}
