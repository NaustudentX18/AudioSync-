import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BookDetailView from '../BookDetailView';
import { BookItem, UserSettings } from '../../types';
import * as speechUtils from '../../utils/speech';
import userEvent from '@testing-library/user-event';

// Mock speech utilities
vi.mock('../../utils/speech', () => ({
  speakWebSpeech: vi.fn(),
  synthesizeElevenLabs: vi.fn(),
  synthesizeOpenAI: vi.fn(),
  synthesizeKokoro: vi.fn(),
}));

// Mock AudioVisualizer to avoid animation issues
vi.mock('../AudioVisualizer', () => ({
  default: () => <div data-testid="audio-visualizer">Visualizer</div>
}));

// Mock Audio
class MockAudio {
  src: string;
  playbackRate: number = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(src: string) {
    this.src = src;
  }

  play() {
    return Promise.resolve();
  }

  pause() {}
}

global.Audio = MockAudio as any;

describe('BookDetailView', () => {
  const mockBook: BookItem = {
    id: 'test-book',
    title: 'Test Title',
    author: 'Test Author',
    content: 'Paragraph 1\n\nParagraph 2\n\nParagraph 3',
    summary: 'Test Summary',
    coverGradient: 'from-red-500',
    dateAdded: '2023-01-01',
    durationSeconds: 300,
    progressSeconds: 0,
  };

  const mockSettings: UserSettings = {
    elevenlabsKey: 'test-el-key',
    openaiKey: 'test-oa-key',
    preferredEngine: 'webspeech',
    selectedVoiceId: 'ws-en-us-neural',
    playbackSpeed: 1,
  };

  const mockOnBack = vi.fn();
  const mockOnUpdateBookProgress = vi.fn();
  const mockOnRecordReading = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (settings = mockSettings, book = mockBook) => {
    return render(
      <BookDetailView
        book={book}
        settings={settings}
        onBack={mockOnBack}
        onUpdateBookProgress={mockOnUpdateBookProgress}
        onRecordReading={mockOnRecordReading}
      />
    );
  };

  it('renders book details correctly', () => {
    renderComponent();
    expect(screen.getAllByText('Test Title').length).toBeGreaterThan(0);
    expect(screen.getByText('by Test Author')).toBeInTheDocument();
    expect(screen.getByText('Test Summary')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 3')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    renderComponent();
    const backButton = screen.getByText('Keep Listening on Library Dashboard');
    fireEvent.click(backButton);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('plays web speech when clicking a paragraph', async () => {
    renderComponent();
    const firstParagraph = screen.getByText('Paragraph 1');
    fireEvent.click(firstParagraph);

    expect(speechUtils.speakWebSpeech).toHaveBeenCalledTimes(1);
    expect(speechUtils.speakWebSpeech).toHaveBeenCalledWith(
      'Paragraph 1',
      'Google US English', // From VOICE_DEFAULTS
      1,
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );

    expect(mockOnUpdateBookProgress).toHaveBeenCalledWith('test-book', 0);
  });

  it('shows error if openai voice is selected and key is missing', async () => {
    const settingsWithoutOpenAI = {
      ...mockSettings,
      openaiKey: '',
      selectedVoiceId: 'oa-alloy' // Requires OpenAI
    };
    renderComponent(settingsWithoutOpenAI);

    const firstParagraph = screen.getByText('Paragraph 1');
    fireEvent.click(firstParagraph);

    await waitFor(() => {
      expect(screen.getByText(/OpenAI key missing/i)).toBeInTheDocument();
    });
  });

  it('shows error if elevenlabs voice is selected and key is missing', async () => {
    const settingsWithoutEL = {
      ...mockSettings,
      elevenlabsKey: '',
      selectedVoiceId: 'el-rachel' // Requires ElevenLabs
    };
    renderComponent(settingsWithoutEL);

    const firstParagraph = screen.getByText('Paragraph 1');
    fireEvent.click(firstParagraph);

    await waitFor(() => {
      expect(screen.getByText(/ElevenLabs x-api-key missing/i)).toBeInTheDocument();
    });
  });

  it('calls synthesizeOpenAI when valid key is provided', async () => {
    const openaiSettings = {
      ...mockSettings,
      selectedVoiceId: 'oa-alloy'
    };

    vi.mocked(speechUtils.synthesizeOpenAI).mockResolvedValue('mock-url');

    renderComponent(openaiSettings);

    const firstParagraph = screen.getByText('Paragraph 1');
    fireEvent.click(firstParagraph);

    await waitFor(() => {
      expect(speechUtils.synthesizeOpenAI).toHaveBeenCalledWith('Paragraph 1', 'alloy', 'test-oa-key');
    });
  });

  it('sets up sleep timer UI successfully', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Open sleep timer dropdown
    const timerButton = screen.getByTitle('Configure Sleep Timer');
    await user.click(timerButton);

    expect(screen.getByText('Set Sleep Timer')).toBeInTheDocument();

    // Select 15m timer
    const fifteenMinButton = screen.getByText('15m');
    await user.click(fifteenMinButton);

    // Check if the timer state is active by reopening
    await user.click(timerButton);
    expect(screen.getByText('Active:')).toBeInTheDocument();
    expect(screen.getByText('15m 0s')).toBeInTheDocument();
  });
});
