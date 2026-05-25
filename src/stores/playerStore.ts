import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';
import { generateSpeech, type VoiceId } from '../lib/tts';

interface PlayerState {
  isPlaying: boolean;
  currentBook: unknown | null;
  currentText: string;
  voice: VoiceId;
  speed: number;
  setIsPlaying: (playing: boolean) => void;
  setCurrentText: (text: string) => void;
  setVoice: (voice: VoiceId) => void;
  setSpeed: (speed: number) => void;
  playText: (text: string) => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isPlaying: false,
  currentBook: null,
  currentText: 'This is a test of AudioSync multi-provider TTS.',
  voice: 'kokoro-af_heart',
  speed: 1.0,

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentText: (text) => set({ currentText: text }),
  setVoice: (voice) => set({ voice }),
  setSpeed: (speed) => set({ speed }),

  playText: async (text: string) => {
    const { voice, speed } = get();
    const settings = useSettingsStore.getState();
    const provider = settings.ttsProvider || 'kokoro';
    set({ isPlaying: true });

    try {
      const wavBytes = await generateSpeech(provider, text, voice, { speed });
      const audioContext = new AudioContext();
      const arrayBuffer = wavBytes.buffer.slice(
        wavBytes.byteOffset,
        wavBytes.byteOffset + wavBytes.byteLength,
      ) as ArrayBuffer;
      const decoded = await audioContext.decodeAudioData(arrayBuffer);
      const audioSource = audioContext.createBufferSource();
      audioSource.buffer = decoded;
      audioSource.connect(audioContext.destination);
      audioSource.start();

      audioSource.onended = () => {
        set({ isPlaying: false });
        void audioContext.close();
      };
    } catch (error) {
      console.error('Playback error:', error);
      set({ isPlaying: false });
    }
  },
}));
