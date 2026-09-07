import { ExampleWidgetData } from "./types";

export function createInitialExampleData(): ExampleWidgetData {
  return {
    id: "ex-1",
    title: "Systemarkitektur & Mall",
    count: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function incrementCount(current: ExampleWidgetData): ExampleWidgetData {
  return {
    ...current,
    count: current.count + 1,
    updatedAt: Date.now(),
  };
}
