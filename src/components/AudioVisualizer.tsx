import { useState, useEffect } from "react";

interface VisualizerProps {
  isPlaying: boolean;
}

export default function AudioVisualizer({ isPlaying }: VisualizerProps) {
  const [heights, setHeights] = useState<number[]>([15, 25, 40, 15, 30, 20, 35, 10, 25, 15, 45, 20, 35, 25, 15]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setHeights(prev =>
        prev.map(() => Math.floor(Math.random() * 32) + 8) // Dynamic random heights
      );
    }, 120);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div id="audio-visualizer" className="flex items-center gap-[3px] h-8 px-2">
      {heights.map((height, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full transition-all duration-150 ${
            isPlaying 
              ? "bg-indigo-500 opacity-90 shadow-[0_0_8px_rgba(99,102,241,0.45)]" 
              : "bg-zinc-600 opacity-60"
          }`}
          style={{
            height: isPlaying ? `${height}px` : "5px"
          }}
        />
      ))}
    </div>
  );
}
