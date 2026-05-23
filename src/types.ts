export type VoiceEngine = "elevenlabs" | "openai" | "webspeech" | "kokoro";

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
  preferredEngine: VoiceEngine;
  selectedVoiceId: string;
  playbackSpeed: number;
}

export type ExportedBookFull = Omit<BookItem, 'content' | 'isDefault'> & {
  schema: string;
  paragraphs: string[];
  fullContent: string;
};

export interface ExportedBookParagraph {
  bookId: string;
  bookTitle: string;
  paragraphIndex: number;
  paragraphContent: string;
}

export type ExportedData = ExportedBookFull | ExportedBookParagraph;
