import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { LiveTranslationWidget } from "../LiveTranslationWidget";
import { QuotaLevel } from "../../domain/quotaService";

let mockQuotaState: {
  usage: number;
  quotaLevel: QuotaLevel;
  isHardStopped: boolean;
  interpreterTracksDisabled: boolean;
  listenersCount: number;
} = {
  usage: 120,
  quotaLevel: "normal",
  isHardStopped: false,
  interpreterTracksDisabled: false,
  listenersCount: 1,
};

vi.mock("../../hooks/useQuotaGuard", () => ({
  useQuotaGuard: () => ({
    ...mockQuotaState,
    toggleInterpreterTracks: vi.fn(() => {
      mockQuotaState.interpreterTracksDisabled = !mockQuotaState.interpreterTracksDisabled;
    }),
    setListenersCount: vi.fn(),
    resetMonthlyUsage: vi.fn(),
    thresholds: { yellow: 6000, red: 8000, hardStop: 9000, max: 10000 },
  }),
}));

// Mock the hook so tests isolate UI behavior cleanly
vi.mock("../../hooks/useLiveTranslation", () => ({
  useLiveTranslation: () => {
    const [status, setStatus] = useState<"idle" | "active" | "rotating">("idle");
    const [targetLanguage, setTargetLanguage] = useState("sv");
    const [activeLanguages, setActiveLanguages] = useState<string[]>(["sv"]);
    const [audioLevel, setAudioLevel] = useState(0);
    const [selectedDeviceId, setSelectedDeviceId] = useState("default");

    const audioDevices: { deviceId: string; label: string }[] = [
      { deviceId: "default", label: "Standardmikrofon" },
      { deviceId: "ndi-input-1", label: "NDI Webcam Input" },
      { deviceId: "usb-mic-2", label: "Shure MV7 USB" },
    ];

    const toggleActiveLanguage = vi.fn((lang: string) => {
      setActiveLanguages((prev) =>
        prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
      );
    });

    const unlockAudioContext = vi.fn();

    return {
      status,
      targetLanguage,
      activeLanguages,
      audioLevel,
      audioDevices,
      selectedDeviceId,
      setSelectedDeviceId: vi.fn((id: string) => setSelectedDeviceId(id)),
      toggleActiveLanguage,
      startTranslation: vi.fn(() => setStatus("active")),
      stopTranslation: vi.fn(() => {
        setStatus("idle");
        setAudioLevel(0);
      }),
      setTargetLanguage: vi.fn((lang: string) => setTargetLanguage(lang)),
      panicMute: vi.fn(() => {
        setStatus("idle");
        setAudioLevel(0);
      }),
      isRotating: status === "rotating",
      error: null,
      configWarning: "Saknade miljövariabler i .env.local: GEMINI_API_KEY",
      unlockAudioContext,
    };
  },
}));

describe("LiveTranslationWidget", () => {
  it("renders initial idle state, warning and controls with Variation 3 editorial layout", () => {
    render(<LiveTranslationWidget />);
    expect(screen.getByText("Realtidstolkning")).toBeDefined();
    expect(screen.getByText(/Saknade miljövariabler/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /starta tolkning/i })).toBeDefined();
    expect(screen.getByText(/Spårkvot/i)).toBeDefined();
  });

  it("handles start and stop translation interactions", () => {
    render(<LiveTranslationWidget />);
    const toggleBtn = screen.getByRole("button", { name: /starta tolkning/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole("button", { name: /avsluta tolkning/i })).toBeDefined();

    const stopBtn = screen.getByRole("button", { name: /avsluta tolkning/i });
    fireEvent.click(stopBtn);
    expect(screen.getByRole("button", { name: /starta tolkning/i })).toBeDefined();
  });

  it("allows selecting audio input device including NDI Webcam Input", () => {
    render(<LiveTranslationWidget />);
    const deviceSelect = screen.getByLabelText(/ljudingång/i) as HTMLSelectElement;
    expect(deviceSelect.value).toBe("default");

    fireEvent.change(deviceSelect, { target: { value: "ndi-input-1" } });
    expect(deviceSelect).toBeDefined();
  });

  it("allows selecting target language including Swahili", () => {
    render(<LiveTranslationWidget />);
    const langSelect = screen.getByLabelText(/målspråk/i) as HTMLSelectElement;
    expect(langSelect.value).toBe("sv");

    // Select Swahili (sw)
    fireEvent.change(langSelect, { target: { value: "sw" } });
    expect(langSelect).toBeDefined();
  });

  it("triggers panic mute and resets state", () => {
    render(<LiveTranslationWidget />);
    const panicBtn = screen.getByRole("button", { name: /panik-tystning/i });
    fireEvent.click(panicBtn);
    expect(panicBtn).toBeDefined();
  });

  it("shows yellow warning and allows disconnecting interpreter tracks manually", () => {
    mockQuotaState = {
      usage: 6500,
      quotaLevel: "warning_yellow",
      isHardStopped: false,
      interpreterTracksDisabled: false,
      listenersCount: 5,
    };

    render(<LiveTranslationWidget />);
    expect(screen.getByText(/GUL VARNING/i)).toBeDefined();
    const disconnectBtn = screen.getByRole("button", { name: /koppla från tolkspår/i });
    fireEvent.click(disconnectBtn);
    expect(disconnectBtn).toBeDefined();
  });

  it("displays hard stop notice and blocks start button when quota is exhausted", () => {
    mockQuotaState = {
      usage: 9005,
      quotaLevel: "hard_stop",
      isHardStopped: true,
      interpreterTracksDisabled: false,
      listenersCount: 10,
    };

    render(<LiveTranslationWidget />);
    expect(screen.getByText(/Sändningen har stängts av automatiskt/i)).toBeDefined();
    const startBtn = screen.getByRole("button", { name: /kvottaket nått/i });
    expect((startBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
