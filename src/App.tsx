import { ExampleWidget } from "./features/example_feature";

export function App() {
  return (
    <main className="min-h-screen bg-stone-100 text-stone-900 flex flex-col items-center justify-center p-4">
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Systemarkitektur & Mall (SI v9.3)
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Autonom utveckling med Feature-Sliced Design och mekaniska kvalitetsspärrar.
        </p>
      </header>
      <ExampleWidget />
    </main>
  );
}

export default App;
