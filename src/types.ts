export type VoiceEngine = "elevenlabs" | "openai" | "webspeech" | "kokoro" | "stepfun";

export interface BookItem {
  id: string;
  title: string;
  author: string | null;
  content: string;
  summary: string;
  coverGradient: string; // Tailwind class string for beautiful bento cards
  dateAdded: string;
  durationSeconds: number; // Estimated duration based on reading speed
  progressSeconds: number; // User's tracking state
  isDefault?: boolean; // System classics
}

export interface VoiceModel {
  id: string;
  name: string;
  engine: VoiceEngine;
  gender: "male" | "female" | "neutral" | "dual";
  description: string;
  voiceIdValue: string; // The official ID used (e.g. "Rachel" or "alloy" or system name)
  previewText?: string;
}

export interface UserSettings {
  elevenlabsKey: string;
  openaiKey: string;
  stepfunApiKey: string;
  preferredEngine: VoiceEngine;
  selectedVoiceId: string;
  playbackSpeed: number;
  stepfunModel: string; // 'stepaudio-2.5-tts' | 'step-tts-2' | 'step-tts-mini'
  ttsProvider: 'kokoro' | 'openai' | 'stepfun';
}

export type ExportedData = {
  books: ExportedBookFull[];
};

export type ExportedBookFull = {
  id: string;
  title: string;
  author: string | null;
  paragraphs: ExportedBookParagraph[];
};

export type ExportedBookParagraph = {
  index: number;
  text: string;
};
