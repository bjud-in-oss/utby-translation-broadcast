import { LiveTranslationWidget } from "./features/live_translation";

export function App() {
  return (
    <main id="app-main" className="min-h-screen bg-stone-100 text-stone-900 flex flex-col items-center justify-center p-4 sm:p-6">
      <header id="app-header" className="text-center mb-8 max-w-md">
        <h1 id="app-title" className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Live Translation
        </h1>
        <p id="app-subtitle" className="mt-2 text-sm text-stone-600">
          Realtids simultantolkning med Gemini Live och Cloudflare SFU / Lokal WS.
        </p>
      </header>
      <LiveTranslationWidget />
    </main>
  );
}

export default App;
