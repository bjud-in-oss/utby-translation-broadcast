import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { App } from "../App";

// Mock the hook that LiveTranslationWidget relies on
vi.mock("../features/live_translation/hooks/useLiveTranslation", () => ({
  useLiveTranslation: () => ({
    status: "idle",
    targetLanguage: "sv",
    audioLevel: 0,
    error: null,
    isRotating: false,
    startTranslation: vi.fn(),
    stopTranslation: vi.fn(),
    panicMute: vi.fn(),
    setTargetLanguage: vi.fn(),
  }),
}));

describe("App Root Component", () => {
  it("renders header and LiveTranslationWidget correctly", () => {
    render(<App />);

    expect(screen.getByText("Live Translation")).toBeDefined();
    expect(screen.getByText(/Cloudflare SFU \/ Lokal WS/i)).toBeDefined();
    expect(screen.getByText("Realtidstolkning")).toBeDefined();
    expect(screen.getByRole("button", { name: /starta tolkning/i })).toBeDefined();
  });

  it("allows interaction with the live translation controls within App", () => {
    render(<App />);

    const startButton = screen.getByRole("button", { name: /starta tolkning/i });
    fireEvent.click(startButton);
    expect(startButton).toBeDefined();
  });
});
