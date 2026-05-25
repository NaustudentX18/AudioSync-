import { KokoroTTS } from 'kokoro-js';

let ttsInstance: KokoroTTS | null = null;

export async function initTTS() {
  if (ttsInstance) return ttsInstance;

  console.log("[TTS] Loading Kokoro model...");
  ttsInstance = await KokoroTTS.from_pretrained(
    'onnx-community/Kokoro-82M-v1.0-ONNX',
    { dtype: 'q8', device: 'wasm' }
  );
  console.log("[TTS] Model loaded successfully");
  return ttsInstance;
}

export async function generateSpeech(text: string, voice = 'af_heart') {
  const tts = await initTTS();
  const audio = await tts.generate(text, { voice });
  return audio.toWav();
}

export function listVoices() {
  return [
    'af_heart', 'af_bella', 'af_nicole', 'af_sky',
    'am_adam', 'am_michael', 'am_onyx',
    'bf_emma', 'bf_isabella',
    'bm_george', 'bm_lewis'
  ];
}
