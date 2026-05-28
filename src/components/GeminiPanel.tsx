import React from 'react';
import { usePlayerStore } from '../stores/playerStore';

export function GeminiPanel() {
  const { currentText } = usePlayerStore();
  const [summary, setSummary] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSummarize = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentText })
      });
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      setSummary('Summary failed — check your Gemini API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>Gemini Intelligence</span>
        <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded font-mono">BYO-KEY</span>
      </h3>

      <button 
        onClick={handleSummarize}
        disabled={loading}
        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-black rounded-xl font-semibold mb-4 transition-all disabled:opacity-50"
      >
        {loading ? "Summarizing..." : "Summarize Current Text"}
      </button>

      {summary && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm leading-relaxed">
          {summary}
        </div>
      )}
    </div>
  );
}
