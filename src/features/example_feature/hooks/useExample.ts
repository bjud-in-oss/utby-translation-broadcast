import { useState, useCallback } from "react";
import { ExampleWidgetData } from "../domain/types";
import { createInitialExampleData, incrementCount } from "../domain/exampleService";

export function useExample() {
  const [data, setData] = useState<ExampleWidgetData>(createInitialExampleData);

  const handleIncrement = useCallback(() => {
    setData((prev) => incrementCount(prev));
  }, []);

  return {
    data,
    handleIncrement,
  };
}
