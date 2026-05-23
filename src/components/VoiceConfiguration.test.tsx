import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VoiceConfiguration from "./VoiceConfiguration";
import { UserSettings } from "../types";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the speech utils
vi.mock("../utils/speech", () => ({
  synthesizeKokoro: vi.fn(),
  synthesizeElevenLabs: vi.fn(),
  synthesizeOpenAI: vi.fn(),
}));

const mockSettings: UserSettings = {
  elevenlabsKey: "",
  openaiKey: "",
  preferredEngine: "webspeech",
  selectedVoiceId: "ws-en-us-neural",
  playbackSpeed: 1,
};

describe("VoiceConfiguration", () => {
  let mockOnUpdateSettings: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnUpdateSettings = vi.fn();
    // mock window.speechSynthesis
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: vi.fn(() => []),
        onvoiceschanged: null,
        cancel: vi.fn(),
        speak: vi.fn(),
      },
      writable: true,
    });

    // mock SpeechSynthesisUtterance
    class MockSpeechSynthesisUtterance {
      text: string;
      voice: any;
      rate: number;
      onend: any;
      onerror: any;
      constructor(text: string) {
        this.text = text;
        this.voice = null;
        this.rate = 1;
        this.onend = null;
        this.onerror = null;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: MockSpeechSynthesisUtterance,
      writable: true,
    });

    // mock HTMLAudioElement
    window.HTMLAudioElement.prototype.play = vi.fn();
    window.HTMLAudioElement.prototype.pause = vi.fn();
  });

  it("renders voices tab by default", () => {
    render(
      <VoiceConfiguration
        settings={mockSettings}
        onUpdateSettings={mockOnUpdateSettings}
      />
    );
    expect(screen.getByText("Curated high-fidelity vocal actors:")).toBeInTheDocument();
  });

  it("can switch to keys tab", async () => {
    render(
      <VoiceConfiguration
        settings={mockSettings}
        onUpdateSettings={mockOnUpdateSettings}
      />
    );
    const user = userEvent.setup();
    const keysTabButton = screen.getByText("API Credentials (BYO Keys)");
    await user.click(keysTabButton);
    expect(screen.getByText("Secure Clientside Storage")).toBeInTheDocument();
  });

  it("updates settings when typing in keys", async () => {
    render(
      <VoiceConfiguration
        settings={mockSettings}
        onUpdateSettings={mockOnUpdateSettings}
      />
    );
    const user = userEvent.setup();
    const keysTabButton = screen.getByText("API Credentials (BYO Keys)");
    await user.click(keysTabButton);

    // There are multiple inputs, need to find by placeholder
    const openAIInput = screen.getByPlaceholderText("sk-proj-...");
    await user.type(openAIInput, "test-key");

    expect(mockOnUpdateSettings).toHaveBeenCalledWith({ openaiKey: "y" }); // State update only captures single latest change per event due to lack of wrapper state
    expect(mockOnUpdateSettings).toHaveBeenCalled();
  });

  it("updates preferred engine when engine selector is clicked", async () => {
    render(
      <VoiceConfiguration
        settings={mockSettings}
        onUpdateSettings={mockOnUpdateSettings}
      />
    );
    const user = userEvent.setup();
    const keysTabButton = screen.getByText("API Credentials (BYO Keys)");
    await user.click(keysTabButton);

    const kokoroButton = screen.getByRole('button', { name: "Kokoro (Offline)" });
    await user.click(kokoroButton);

    expect(mockOnUpdateSettings).toHaveBeenCalledWith({
      preferredEngine: "kokoro",
      selectedVoiceId: "ko-af-heart"
    });
  });

  it("filters voices by engine", async () => {
    render(
      <VoiceConfiguration
        settings={mockSettings}
        onUpdateSettings={mockOnUpdateSettings}
      />
    );
    const user = userEvent.setup();

    // Initially "All Drivers" should show multiple engines, e.g. OpenAI
    expect(screen.getByText("Alloy (OpenAI)")).toBeInTheDocument();

    // Filter to Native Speech
    const nativeFilterBtn = screen.getByRole('button', { name: "Native Speech" });
    await user.click(nativeFilterBtn);

    // OpenAI voice should disappear
    expect(screen.queryByText("Alloy (OpenAI)")).not.toBeInTheDocument();

    // Native voice should still be there
    expect(screen.getByText("Standard Native Default")).toBeInTheDocument();
  });

  it("plays a preview for webspeech", async () => {
    render(
      <VoiceConfiguration
        settings={mockSettings}
        onUpdateSettings={mockOnUpdateSettings}
      />
    );
    const user = userEvent.setup();

    // Click the play button for the default webspeech voice
    const playButtons = screen.getAllByTitle("Prehear Voice Anchor");
    await user.click(playButtons[0]);

    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it("shows key missing warning for missing API keys", () => {
    render(
      <VoiceConfiguration
        settings={{...mockSettings, openaiKey: ""}}
        onUpdateSettings={mockOnUpdateSettings}
      />
    );

    // The keys missing text will be displayed in the voice card if openai doesn't have a key
    expect(screen.getAllByText("Key Missing").length).toBeGreaterThan(0);
  });
});
