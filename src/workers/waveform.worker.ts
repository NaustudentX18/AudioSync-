export {};

type WaveformJob = {
  pcmData: Float32Array;
  samples: number;
};

self.onmessage = (event: MessageEvent<WaveformJob>) => {
  const { pcmData, samples } = event.data;
  if (!pcmData?.length || samples <= 0) {
    self.postMessage([]);
    return;
  }

  const chunkSize = Math.max(1, Math.floor(pcmData.length / samples));
  const peaks = new Array<number>(samples).fill(0);

  for (let i = 0; i < samples; i += 1) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, pcmData.length);
    let max = 0;

    for (let j = start; j < end; j += 1) {
      const value = Math.abs(pcmData[j]);
      if (value > max) max = value;
    }

    peaks[i] = max;
  }

  self.postMessage(peaks);
};
