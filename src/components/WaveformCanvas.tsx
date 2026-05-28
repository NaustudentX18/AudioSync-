import { useEffect, useMemo, useRef, useState } from 'react';

interface WaveformCanvasProps {
  pcmData: Float32Array | null;
  currentTime: number;
  duration: number;
  markerRatios?: number[];
  onSeek?: (ratio: number) => void;
  onDoubleTapSide?: (side: 'left' | 'right') => void;
  onLongPress?: () => void;
  onSwipeSeek?: (direction: 'left' | 'right') => void;
}

const BAR_WIDTH = 3;
const GAP = 1;
const WAVEFORM_HEIGHT = 96;
const DOUBLE_TAP_MS = 280;
const LONG_PRESS_MS = 500;

export function WaveformCanvas({
  pcmData,
  currentTime,
  duration,
  markerRatios = [],
  onSeek,
  onDoubleTapSide,
  onLongPress,
  onSwipeSeek,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const lastTapRef = useRef(0);
  const startXRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const samples = useMemo(() => 260, []);
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  useEffect(() => {
    if (!pcmData?.length) {
      setPeaks([]);
      return;
    }

    const worker = new Worker(new URL('../workers/waveform.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<number[]>) => {
      setPeaks(event.data);
      worker.terminate();
    };

    worker.postMessage({ pcmData, samples });

    return () => worker.terminate();
  }, [pcmData, samples]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = WAVEFORM_HEIGHT;

    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    if (!peaks.length) {
      ctx.fillStyle = '#52525b';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText('Waveform will appear after first playback generation', 12, 24);
      return;
    }

    const centerY = cssHeight / 2;
    const totalBarsWidth = peaks.length * (BAR_WIDTH + GAP);
    const startX = Math.max(0, (cssWidth - totalBarsWidth) / 2);
    const playedBars = Math.floor(progress * peaks.length);

    for (let i = 0; i < peaks.length; i += 1) {
      const normalizedHeight = Math.max(6, peaks[i] * (cssHeight * 0.9));
      const barHeight = Math.min(cssHeight - 8, normalizedHeight);
      const x = startX + i * (BAR_WIDTH + GAP);
      const y = centerY - barHeight / 2;

      ctx.fillStyle = i <= playedBars ? '#f59e0b' : '#3f3f46';
      ctx.fillRect(x, y, BAR_WIDTH, barHeight);
    }

    for (const ratio of markerRatios) {
      const x = startX + Math.min(1, Math.max(0, ratio)) * totalBarsWidth;
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(x, 0, 1, cssHeight);
    }

    const progressX = startX + progress * totalBarsWidth;
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(progressX, 0, 1, cssHeight);
  }, [peaks, progress, markerRatios]);

  const ratioFromClientX = (clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 touch-pan-y"
      style={{ height: `${WAVEFORM_HEIGHT}px` }}
      onClick={(e) => onSeek?.(ratioFromClientX(e.clientX))}
      onPointerDown={(e) => {
        startXRef.current = e.clientX;
        if (onLongPress) {
          longPressTimerRef.current = window.setTimeout(() => {
            onLongPress();
            longPressTimerRef.current = null;
          }, LONG_PRESS_MS);
        }
      }}
      onPointerMove={(e) => {
        if (startXRef.current == null) return;
        if (Math.abs(e.clientX - startXRef.current) > 10 && longPressTimerRef.current != null) {
          window.clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }}
      onPointerUp={(e) => {
        if (longPressTimerRef.current != null) {
          window.clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }

        const now = Date.now();
        if (now - lastTapRef.current < DOUBLE_TAP_MS) {
          const ratio = ratioFromClientX(e.clientX);
          onDoubleTapSide?.(ratio < 0.5 ? 'left' : 'right');
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }

        if (startXRef.current != null) {
          const delta = e.clientX - startXRef.current;
          if (Math.abs(delta) > 60) {
            onSwipeSeek?.(delta > 0 ? 'right' : 'left');
          }
        }

        startXRef.current = null;
      }}
      onPointerCancel={() => {
        if (longPressTimerRef.current != null) {
          window.clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        startXRef.current = null;
      }}
    />
  );
}
