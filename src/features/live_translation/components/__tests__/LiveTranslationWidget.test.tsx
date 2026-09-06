import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { LiveTranslationWidget } from "../LiveTranslationWidget";

// Mock the hook so tests isolate UI behavior cleanly
vi.mock("../../hooks/useLiveTranslation", () => ({
  useLiveTranslation: () => {
    const [status, setStatus] = React.useState<"idle" | "active" | "rotating">("idle");
    const [targetLanguage, setTargetLanguage] = React.useState("sv");
    const [audioLevel, setAudioLevel] = React.useState(0);

    return {
      status,
      targetLanguage,
      audioLevel,
      startTranslation: vi.fn(() => setStatus("active")),
      stopTranslation: vi.fn(() => {
        setStatus("idle");
        setAudioLevel(0);
      }),
      setTargetLanguage,
      panicMute: vi.fn(() => {
        setStatus("idle");
        setAudioLevel(0);
      }),
      isRotating: status === "rotating",
      error: null,
    };
  },
}));

describe("LiveTranslationWidget", () => {
  it("renders initial idle state and controls", () => {
    render(<LiveTranslationWidget />);
    expect(screen.getByText("Realtidstolkning")).toBeDefined();
    expect(screen.getByRole("button", { name: /starta tolkning/i })).toBeDefined();
  });

  it("handles start and stop translation interactions", () => {
    render(<LiveTranslationWidget />);
    const toggleBtn = screen.getByRole("button", { name: /starta tolkning/i });
    fireEvent.click(toggleBtn);

    // After clicking start, the button changes to stop
    expect(screen.getByRole("button", { name: /avsluta tolkning/i })).toBeDefined();

    const stopBtn = screen.getByRole("button", { name: /avsluta tolkning/i });
    fireEvent.click(stopBtn);
    expect(screen.getByRole("button", { name: /starta tolkning/i })).toBeDefined();
  });

  it("allows selecting target language", () => {
    render(<LiveTranslationWidget />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("sv");

    fireEvent.change(select, { target: { value: "es" } });
    expect(select.value).toBe("es");
  });

  it("triggers panic mute and resets playback", () => {
    render(<LiveTranslationWidget />);
    const toggleBtn = screen.getByRole("button", { name: /starta tolkning/i });
    fireEvent.click(toggleBtn);

    const panicBtn = screen.getByRole("button", { name: /snabb-tystning/i });
    fireEvent.click(panicBtn);
    expect(screen.getByRole("button", { name: /starta tolkning/i })).toBeDefined();
  });
});
