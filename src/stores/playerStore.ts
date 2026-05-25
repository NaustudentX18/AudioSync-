import { create } from 'zustand';

interface PlayerState {
  isPlaying: boolean;
  currentBook: any | null;
  currentText: string;
  voice: string;
  speed: number;
  setIsPlaying: (playing: boolean) => void;
  setCurrentText: (text: string) => void;
  setVoice: (voice: string) => void;
  setSpeed: (speed: number) => void;
  playText: (text: string) => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isPlaying: false,
  currentBook: null,
  currentText: "This is a test of AudioSync local TTS.",
  voice: "af_heart",
  speed: 1.0,

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentText: (text) => set({ currentText: text }),
  setVoice: (voice) => set({ voice }),
  setSpeed: (speed) => set({ speed }),

  playText: async (text: string) => {
    const { voice } = get();
    set({ isPlaying: true });

    try {
      const audioBuffer = await generateSpeech(text, voice);
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioSource = audioContext.createBufferSource();
      audioSource.buffer = audioBuffer;
      audioSource.connect(audioContext.destination);
      audioSource.start();
      
      audioSource.onended = () => {
        set({ isPlaying: false });
      };
    } catch (error) {
      console.error("Playback error:", error);
      set({ isPlaying: false });
    }
  },
}));
