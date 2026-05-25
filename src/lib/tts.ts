import { KokoroTTS } from 'kokoro-js';

const VOICES = [
  'af_heart',
  'af_bella',
  'af_nicole',
  'af_sky',
  'am_adam',
  'am_michael',
  'am_onyx',
  'bf_emma',
  'bf_isabella',
  'bm_george',
  'bm_lewis',
] as const;

export type VoiceId = (typeof VOICES)[number];

let ttsInstance: KokoroTTS | null = null;

export async function initTTS() {
  if (ttsInstance) return ttsInstance;

  console.log('[TTS] Loading Kokoro model...');
  ttsInstance = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
    dtype: 'q8',
    device: 'wasm',
  });
  console.log('[TTS] Model loaded successfully');
  return ttsInstance;
}

export async function generateSpeech(text: string, voice: VoiceId = 'af_heart'): Promise<Uint8Array> {
  const tts = await initTTS();
  const audio = await tts.generate(text, { voice });
  const wav = audio.toWav();
  return wav instanceof Uint8Array ? wav : new Uint8Array(wav);
}

export function listVoices(): readonly VoiceId[] {
  return VOICES;
}
