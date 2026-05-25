/**
 * Unified TTS Provider Registry
 * Supports: kokoro, openai, stepfun
 */

import { KokoroTTS } from 'kokoro-js';
import { useSettingsStore } from '../stores/settingsStore';
import { StepFunTTS, BUILTIN_VOICES } from './tts-stepfun';
import { synthesizeOpenAI } from '../utils/speech';
import { VoiceEngine } from '../types';

// ── Kokoro ──────────────────────────────────────────────────────────────────

const VOICES = [
  'af_heart', 'af_bella', 'af_nicole', 'af_sky',
  'am_adam', 'am_michael', 'am_onyx',
  'bf_emma', 'bf_isabella',
  'bm_george', 'bm_lewis',
] as const;

export type VoiceId = (typeof VOICES)[number];

let kokoroInstance: KokoroTTS | null = null;

async function getKokoroInstance(): Promise<KokoroTTS> {
  if (kokoroInstance) return kokoroInstance;
  kokoroInstance = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
    dtype: 'q8',
    device: 'wasm',
  });
  return kokoroInstance;
}

async function generateKokoroSpeech(text: string, voice: VoiceId = 'af_heart'): Promise<Uint8Array> {
  const tts = await getKokoroInstance();
  const audio = await tts.generate(text, { voice });
  const wav = audio.toWav();
  return wav instanceof Uint8Array ? wav : new Uint8Array(wav);
}

// ── StepFun Client Cache ─────────────────────────────────────────────────────

const stepFunClients = new Map<string, StepFunTTS>();

function getStepFunClient(apiKey: string, model: string): StepFunTTS {
  const cacheKey = `${apiKey}:${model}`;
  let client = stepFunClients.get(cacheKey);
  if (!client) {
    client = new StepFunTTS(apiKey, 'https://api.stepfun.ai/v1', model);
    stepFunClients.set(cacheKey, client);
  }
  return client;
}

// ── Provider Registry ────────────────────────────────────────────────────────

export interface TTSProvider {
  generateSpeech: (text: string, voiceId: string, opts?: Record<string, unknown>) => Promise<Uint8Array>;
  listVoices: (opts?: Record<string, unknown>) => Promise<string[]>;
}

const providers: Record<string, TTSProvider> = {
  kokoro: {
    generateSpeech: async (text, voiceId) => generateKokoroSpeech(text, voiceId as VoiceId),
    listVoices: async () => Array.from(VOICES),
  },
  openai: {
    generateSpeech: async (text, voiceId, opts = {}) => {
      const url = await synthesizeOpenAI(text, voiceId, (opts as any)?.apiKey || '');
      const response = await fetch(url);
      if (!response.ok) throw new Error(`OpenAI TTS failed (${response.status})`);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    },
    listVoices: async () => ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
  },
  stepfun: {
    generateSpeech: async (text, voiceId, opts = {}) => {
      const settings = useSettingsStore.getState();
      const apiKey = (opts as any)?.apiKey || settings.stepfunApiKey;
      const model = (opts as any)?.model || settings.stepfunModel || 'step-tts-2';
      if (!apiKey) throw new Error('StepFun API key not configured. Add it in Settings.');
      const client = getStepFunClient(apiKey, model);
      return client.generateSpeech(text, voiceId, opts as any);
    },
    listVoices: async (opts = {}) => {
      const settings = useSettingsStore.getState();
      const apiKey = (opts as any)?.apiKey || settings.stepfunApiKey;
      if (!apiKey) return BUILTIN_VOICES.map((v) => v.id);
      const client = getStepFunClient(apiKey, settings.stepfunModel || 'step-tts-2');
      const voices = await client.listVoices();
      return voices.map((v) => v.id);
    },
  },
};

// ── Public API ───────────────────────────────────────────────────────────────

export async function generateSpeech(
  provider: string,
  text: string,
  voiceId: string,
  opts: { speed?: number; apiKey?: string; model?: string } = {},
): Promise<Uint8Array> {
  const p = providers[provider];
  if (!p) throw new Error(`Unsupported TTS provider: ${provider}`);
  return p.generateSpeech(text, voiceId, opts);
}

export async function listProviderVoices(provider: string): Promise<string[]> {
  const p = providers[provider];
  if (!p) return [];
  return p.listVoices();
}

/** Read active provider from settings and synthesize */
export async function generateSpeechFromSettings(
  text: string,
  voiceId: string,
  opts: { speed?: number } = {},
): Promise<Uint8Array> {
  const settings = useSettingsStore.getState();
  const provider = settings.ttsProvider || 'kokoro';
  return generateSpeech(provider, text, voiceId, opts);
}

export { VOICES, BUILTIN_VOICES };
