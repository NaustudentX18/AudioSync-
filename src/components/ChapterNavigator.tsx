import React from 'react';
import { usePlayerStore } from '../stores/playerStore';

export function ChapterNavigator() {
  const { currentBook, setCurrentText } = usePlayerStore();

  const chapters = [
    "Chapter 1 - The Beginning",
    "Chapter 2 - The Journey",
    "Chapter 3 - The Revelation",
    "Chapter 4 - The End"
  ];

  const handleChapterClick = (chapter: string) => {
    setCurrentText(`Reading from ${chapter}... This is sample text for the chapter. The story continues with the hero facing new challenges.`);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <h3 className="text-lg font-semibold mb-4">Chapters</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {chapters.map((chapter, index) => (
          <button
            key={index}
            onClick={() => handleChapterClick(chapter)}
            className="w-full text-left p-3 bg-zinc-950 hover:bg-zinc-800 rounded-xl border border-zinc-800 hover:border-amber-500 transition-all text-sm"
          >
            {chapter}
          </button>
        ))}
      </div>
    </div>
  );
}
