import React, { useState } from 'react';
import { generateSpeech, listVoices, initTTS } from '../lib/tts';

export function Player() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [text, setText] = useState("This is a test of AudioSync local TTS using Kokoro.");
  const [voice, setVoice] = useState("af_heart");
  const [status, setStatus] = useState("Ready");
  const voices = listVoices();

  const handlePlay = async () => {
    setIsPlaying(true);
    setStatus("Generating speech...");

    try {
      await initTTS();
      const audio = await generateSpeech(text, voice);
      
      // Create audio element and play
      const audioUrl = URL.createObjectURL(new Blob([audio], { type: 'audio/wav' }));
      const audioElement = new Audio(audioUrl);
      
      audioElement.onended = () => {
        setIsPlaying(false);
        setStatus("Ready");
        URL.revokeObjectURL(audioUrl);
      };
      
      audioElement.play();
      setStatus("Playing...");
    } catch (error) {
      console.error("TTS Error:", error);
      setStatus("Error generating speech");
      setIsPlaying(false);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">AudioSync Player</h2>
          <p className="text-sm text-zinc-400 mt-1">Local Kokoro TTS • 100% Offline</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">STATUS</div>
          <div className="text-sm font-mono text-amber-400">{status}</div>
        </div>
      </div>

      <div className="mb-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm resize-none focus:outline-none focus:border-amber-500"
          placeholder="Enter text to synthesize..."
        />
      </div>

      <div className="flex gap-3">
        <button 
          onClick={handlePlay}
          disabled={isPlaying}
          className="flex-1 py-3.5 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isPlaying ? "Generating..." : "Play Voice"}
        </button>

        <select 
          value={voice} 
          onChange={(e) => setVoice(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 text-white px-5 rounded-xl font-mono text-sm"
        >
          {voices.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
