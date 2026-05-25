import { KokoroTTS } from 'kokoro-js';

let ttsInstance: KokoroTTS | null = null;

export async function initTTS() {
  if (ttsInstance) return ttsInstance;

  ttsInstance = await KokoroTTS.from_pretrained(
    'onnx-community/Kokoro-82M-v1.0-ONNX',
    { dtype: 'q8', device: 'wasm' }
  );

  return ttsInstance;
}

export async function generateSpeech(text: string, voice = 'af_heart') {
  const tts = await initTTS();
  const audio = await tts.generate(text, { voice });
  return audio;
}

export function listVoices() {
  // Return common high-quality voices
  return [
    'af_heart', 'af_bella', 'af_nicole',
    'am_adam', 'am_michael', 'bf_emma'
  ];
}
