import React from 'react';
import { generateSpeech, listVoices } from '../lib/tts';

export function Player() {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentText, setCurrentText] = React.useState("Hello, this is a test of AudioSync local TTS.");
  const [voice, setVoice] = React.useState("af_heart");
  const voices = listVoices();

  const handlePlay = async () => {
    setIsPlaying(true);
    try {
      const audio = await generateSpeech(currentText, voice);
      // In real implementation: play the audio buffer
      console.log("Generated audio:", audio);
      setTimeout(() => setIsPlaying(false), 2000); // placeholder
    } catch (error) {
      console.error("TTS error:", error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Now Playing</h2>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-amber-500 rounded-full" />
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={handlePlay}
          disabled={isPlaying}
          className="flex-1 py-3 bg-white text-black rounded-xl font-medium disabled:opacity-50"
        >
          {isPlaying ? "Generating..." : "Play"}
        </button>
        
        <select 
          value={voice} 
          onChange={(e) => setVoice(e.target.value)}
          className="bg-zinc-800 text-white px-4 rounded-xl"
        >
          {voices.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      <textarea
        value={currentText}
        onChange={(e) => setCurrentText(e.target.value)}
        className="w-full h-32 bg-zinc-800 rounded-xl p-4 text-sm resize-none"
      />
    </div>
  );
}
