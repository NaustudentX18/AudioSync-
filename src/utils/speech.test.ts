import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock kokoro-js entirely so that its global imports/wasm initialization don't crash jsdom
vi.mock('kokoro-js', () => {
  return {
    KokoroTTS: {
      from_pretrained: vi.fn()
    }
  };
});

import { speakWebSpeech } from './speech';

describe('speakWebSpeech', () => {
  let originalSpeechSynthesis: any;
  let originalSpeechSynthesisUtterance: any;

  beforeEach(() => {
    // Save originals just in case
    originalSpeechSynthesis = window.speechSynthesis;
    // @ts-ignore
    originalSpeechSynthesisUtterance = window.SpeechSynthesisUtterance;
  });

  afterEach(() => {
    // Restore originals
    // @ts-ignore
    if (originalSpeechSynthesis === undefined) {
        // @ts-ignore
        delete window.speechSynthesis;
    } else {
        // @ts-ignore
        window.speechSynthesis = originalSpeechSynthesis;
    }

    if (originalSpeechSynthesisUtterance === undefined) {
        // @ts-ignore
        delete window.SpeechSynthesisUtterance;
    } else {
        // @ts-ignore
        window.SpeechSynthesisUtterance = originalSpeechSynthesisUtterance;
    }
    vi.clearAllMocks();
  });

  it('calls onError and returns null if window.speechSynthesis is not available', () => {
    // @ts-ignore
    delete window.speechSynthesis;

    const onError = vi.fn();
    const result = speakWebSpeech('test', 'en-US', 1, vi.fn(), vi.fn(), onError);

    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledWith(new Error("Web Speech API not supported in this browser environment."));
  });

  it('cancels existing speech, selects correct voice, and speaks', () => {
    const mockCancel = vi.fn();
    const mockSpeak = vi.fn();
    const mockVoice1 = { name: 'Voice 1', lang: 'en-GB' };
    const mockVoice2 = { name: 'Target Voice', lang: 'en-US' };

    const mockGetVoices = vi.fn().mockReturnValue([mockVoice1, mockVoice2]);

    // @ts-ignore
    window.speechSynthesis = {
      cancel: mockCancel,
      speak: mockSpeak,
      getVoices: mockGetVoices,
    };

    class MockUtterance {
      text: string;
      rate: number = 1;
      pitch: number = 1;
      voice: any = null;
      onboundary: any = null;
      onend: any = null;
      onerror: any = null;

      constructor(text: string) {
        this.text = text;
      }
    }
    // @ts-ignore
    window.SpeechSynthesisUtterance = MockUtterance;

    const result = speakWebSpeech('Hello world', 'Target Voice', 1.5, vi.fn(), vi.fn(), vi.fn());

    expect(mockCancel).toHaveBeenCalled();
    expect(mockGetVoices).toHaveBeenCalled();
    expect(result).toBeInstanceOf(MockUtterance);
    expect(result!.text).toBe('Hello world');
    expect(result!.rate).toBe(1.5);
    expect(result!.pitch).toBe(1.0);
    expect(result!.voice).toBe(mockVoice2);
    expect(mockSpeak).toHaveBeenCalledWith(result);
  });

  it('handles voice matching by lang if name does not match', () => {
    const mockCancel = vi.fn();
    const mockSpeak = vi.fn();
    const mockVoice1 = { name: 'Voice 1', lang: 'en-GB' };
    const mockVoice2 = { name: 'Voice 2', lang: 'fr-FR' };

    const mockGetVoices = vi.fn().mockReturnValue([mockVoice1, mockVoice2]);

    // @ts-ignore
    window.speechSynthesis = {
      cancel: mockCancel,
      speak: mockSpeak,
      getVoices: mockGetVoices,
    };

    class MockUtterance {
      text: string;
      rate: number = 1;
      pitch: number = 1;
      voice: any = null;
      onboundary: any = null;
      onend: any = null;
      onerror: any = null;

      constructor(text: string) {
        this.text = text;
      }
    }
    // @ts-ignore
    window.SpeechSynthesisUtterance = MockUtterance;

    const result = speakWebSpeech('Bonjour', 'fr-FR', 1.0, vi.fn(), vi.fn(), vi.fn());

    expect(result!.voice).toBe(mockVoice2);
  });

  it('handles onboundary event properly', () => {
    // Setup mock
    // @ts-ignore
    window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn(), getVoices: vi.fn().mockReturnValue([]) };
    class MockUtterance { constructor(public text: string) {} }
    // @ts-ignore
    window.SpeechSynthesisUtterance = MockUtterance;

    const onBoundary = vi.fn();
    const result: any = speakWebSpeech('test', 'en-US', 1, onBoundary, vi.fn(), vi.fn());

    // Trigger onboundary
    result.onboundary({ name: 'word', charIndex: 5 });
    expect(onBoundary).toHaveBeenCalledWith(5);

    // Ignore non-word boundary
    result.onboundary({ name: 'sentence', charIndex: 10 });
    expect(onBoundary).toHaveBeenCalledTimes(1); // Still 1 from previous call
  });

  it('handles onend event properly', () => {
    // @ts-ignore
    window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn(), getVoices: vi.fn().mockReturnValue([]) };
    class MockUtterance { constructor(public text: string) {} }
    // @ts-ignore
    window.SpeechSynthesisUtterance = MockUtterance;

    const onEnd = vi.fn();
    const result: any = speakWebSpeech('test', 'en-US', 1, vi.fn(), onEnd, vi.fn());

    result.onend();
    expect(onEnd).toHaveBeenCalled();
  });

  it('handles onerror event properly, ignoring "interrupted"', () => {
    // @ts-ignore
    window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn(), getVoices: vi.fn().mockReturnValue([]) };
    class MockUtterance { constructor(public text: string) {} }
    // @ts-ignore
    window.SpeechSynthesisUtterance = MockUtterance;

    const onError = vi.fn();
    const result: any = speakWebSpeech('test', 'en-US', 1, vi.fn(), vi.fn(), onError);

    // Call with normal error
    const errEvent = { error: 'network' };
    result.onerror(errEvent);
    expect(onError).toHaveBeenCalledWith(errEvent);

    // Call with interrupted error
    result.onerror({ error: 'interrupted' });
    expect(onError).toHaveBeenCalledTimes(1); // Count shouldn't increase
  });
});
