/**
 * StepFun TTS Provider
 *
 * Wraps StepFun's StepAudio API (OpenAI-compatible) for:
 *  - Standard speech synthesis (step-tts-2, step-tts-mini, stepaudio-2.5-tts)
 *  - Voice cloning (step-tts-2, step-tts-mini only)
 *  - Voice preview (zero-shot clone preview without permanent voice creation)
 *
 * Base URL: https://api.stepfun.ai/v1
 * Auth: Bearer token (API key)
 *
 * Uses the OpenAI SDK pointed at StepFun's base URL.
 */

import OpenAI from 'openai';

// ── Types ────────────────────────────────────────────────────────────────────

export interface StepFunVoice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  languages: string[];
  modelCompatibility: {
    'stepaudio-2.5-tts'?: boolean;
    'step-tts-2'?: boolean;
    'step-tts-mini'?: boolean;
  };
  scenario?: string;
  /** Cloned voice — true for user-created voices */
  isCloned?: boolean;
}

export interface StepFunCloneRequest {
  model: 'step-tts-2' | 'step-tts-mini';
  file_id: string;
  text?: string;          // transcript of reference audio (recommended)
  sample_text?: string;   // max 50 chars, used for preview
}

export interface StepFunCloneResponse {
  id: string;
  object: string;
  duplicated: boolean;
  sample_text: string;
  sample_audio: string;   // base64 WAV
}

export interface StepFunTTSOptions {
  model?: string;
  voice_label?: { emotion?: string; style?: string; language?: string };
  instruction?: string;   // only for stepaudio-2.5-tts, max 200 chars
  speed?: number;         // 0.5 – 2.0
  volume?: number;        // 0.1 – 2.0
  sample_rate?: 8000 | 16000 | 22050 | 24000 | 48000;
  response_format?: 'wav' | 'mp3' | 'flac' | 'opus' | 'pcm';
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'https://api.stepfun.ai/v1';
const DEFAULT_MODEL = 'step-tts-2';

/** Built-in StepFun voices (static list from official docs, May 2026). */
export const BUILTIN_VOICES: StepFunVoice[] = [
  { id: 'lively-girl',              name: 'Lively Girl',           gender: 'female', languages: ['EN','ZH'], modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true } },
  { id: 'livelybreezy-female',      name: 'Lively Breezy',         gender: 'female', languages: ['EN','ZH'], modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'zhengpaiqingnian',         name: 'Upright Youth',         gender: 'neutral',languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'shuangkuainansheng',       name: 'Straightforward Male',  gender: 'male',   languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true } },
  { id: 'ganliannvsheng',           name: 'Capable Female',        gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true } },
  { id: 'qinhenvsheng',             name: 'Warm Female',           gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true } },
  { id: 'huolinvsheng',             name: 'Energetic Female',      gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true } },
  { id: 'elegantgentle-female',     name: 'Elegant Gentle',        gender: 'female', languages: ['EN','ZH'], modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'wenrounansheng',           name: 'Gentle Male',           gender: 'male',   languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'jingdiannvsheng',          name: 'Classic Female',        gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'wenroushunv',              name: 'Mature Gentle',         gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'tianmeinvsheng',           name: 'Sweet Female',          gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'qingchunshaonv',           name: 'Pure Girl',             gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'yuanqinansheng',           name: 'Spirited Male',         gender: 'male',   languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'ruyananshi',               name: 'Scholarly Gentleman',   gender: 'male',   languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'wenrounvsheng',            name: 'Gentle Female',         gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'wenrougongzi',             name: 'Tender Gentleman',      gender: 'male',   languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'cixingnansheng',           name: 'Magnetic Male',         gender: 'male',   languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'yuanqishaonv',             name: 'Spirited Girl',         gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'boyinnansheng',            name: 'Broadcast Male',        gender: 'male',   languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'shenchennanyin',           name: 'Deep Male',             gender: 'male',   languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'soft-spoken-gentleman',    name: 'Soft-spoken Gentleman', gender: 'male',   languages: ['EN'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true } },
  { id: 'qinqienvsheng',            name: 'Friendly Female',       gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'linjiajiejie',             name: 'Girl Next Door',        gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'jilingshaonv',             name: 'Clever Girl',           gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'linjiameimei',             name: 'Kid Sister',            gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'zhixingjiejie',            name: 'Intellectual Lady',     gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'vibrant-youth',            name: 'Vibrant Youth',         gender: 'neutral',languages: ['EN'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true } },
  { id: 'magnetic-voiced-male',     name: 'Magnetic-voiced Male',  gender: 'male',   languages: ['EN'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true } },
  { id: 'qingniandaxuesheng',       name: 'College Student',       gender: 'male',   languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'ruanmengnvsheng',          name: 'Cute Soft Female',      gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
  { id: 'youyanvsheng',             name: 'Elegant Female',        gender: 'female', languages: ['ZH'],     modelCompatibility: { 'stepaudio-2.5-tts': true, 'step-tts-2': true, 'step-tts-mini': true } },
];

// ── Client ────────────────────────────────────────────────────────────────────

export class StepFunTTS {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseUrl: string = DEFAULT_BASE_URL, model: string = DEFAULT_MODEL) {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl });
    this.model = model;
  }

  /** Synthesize text → raw audio bytes. Returns WAV by default. */
  async generateSpeech(
    text: string,
    voiceId: string,
    opts: StepFunTTSOptions = {},
  ): Promise<Uint8Array> {
    const { voice_label, instruction, speed = 1, volume = 1, sample_rate = 24000, response_format = 'wav' } = opts;

    const body: Record<string, unknown> = {
      model: this.model,
      input: text.slice(0, 1_000),   // API limit
      voice: voiceId,
      response_format,
      speed: Math.max(0.5, Math.min(2, speed)),
      volume: Math.max(0.1, Math.min(2, volume)),
      sample_rate,
    };

    if (voice_label) body.voice_label = voice_label;
    if (instruction) body.instruction = instruction.slice(0, 200);

    const resp = await this.client.audio.speech.create(body, { responseType: 'arraybuffer' });
    return new Uint8Array(resp as ArrayBuffer);
  }

  /** Stream synthesis via SSE — yields AudioDeltaEvent[] */
  async *streamSpeech(
    text: string,
    voiceId: string,
    opts: StepFunTTSOptions = {},
  ): AsyncGenerator<Uint8Array, void, unknown> {
    const { voice_label, instruction, speed = 1, volume = 1, sample_rate = 24000 } = opts;

    const body: Record<string, unknown> = {
      model: this.model,
      input: text.slice(0, 1_000),
      voice: voiceId,
      stream_format: 'sse',
      speed: Math.max(0.5, Math.min(2, speed)),
      volume: Math.max(0.1, Math.min(2, volume)),
      sample_rate,
    };

    if (voice_label) body.voice_label = voice_label;
    if (instruction) body.instruction = instruction.slice(0, 200);

    const stream = await this.client.audio.speech.stream(body);
    for await (const event of stream) {
      if (event.type === 'speech.audio.delta' && event.delta) {
        yield new Uint8Array(event.delta);
      }
    }
  }

  /** Upload reference audio for voice cloning. Returns file_id. */
  async uploadReferenceAudio(file: File | Blob): Promise<string> {
    const form = new FormData();
    form.append('purpose', 'storage');
    form.append('file', file);

    const resp = await fetch(`${this.client.baseURL}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.client.apiKey}` },
      body: form,
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Upload failed (${resp.status})`);
    }

    const data = await resp.json();
    return data.id;
  }

  /** Create a permanently cloned voice. Returns voice ID. */
  async cloneVoice(request: StepFunCloneRequest): Promise<StepFunCloneResponse> {
    const resp = await fetch(`${this.client.baseURL}/audio/voices`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Clone failed (${resp.status})`);
    }

    return resp.json();
  }

  /** Preview a voice clone without permanently creating it. Returns base64 WAV. */
  async previewVoice(request: {
    model: 'stepaudio-2.5-tts' | 'step-tts-2';
    file_id: string;
    text?: string;
    sample_text: string;
    response_format?: string;
    speed?: number;
    volume?: number;
    voice_label?: { emotion?: string };
    instruction?: string;
  }): Promise<{ sample_audio: string; request_id: string }> {
    const resp = await fetch(`${this.client.baseURL}/audio/voices/preview`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Preview failed (${resp.status})`);
    }

    return resp.json();
  }

  /** Fetch all voices (built-in + cloned) from the API. */
  async listVoices(): Promise<StepFunVoice[]> {
    const resp = await fetch(`${this.client.baseURL}/audio/voices`, {
      headers: { Authorization: `Bearer ${this.client.apiKey}` },
    });

    if (!resp.ok) {
      // Fall back to static list on network error
      return BUILTIN_VOICES;
    }

    const data = await resp.json();
    // API returns { object, data: [...] } — adapt to StepFunVoice[]
    const apiVoices: StepFunVoice[] = (data.data || []).map((v: Record<string, unknown>) => ({
      id: v.id as string,
      name: (v.name as string) || v.id,
      gender: (v.gender as StepFunVoice['gender']) || 'neutral',
      languages: (v.languages as string[]) || ['ZH', 'EN'],
      modelCompatibility: (v.model_compatibility as StepFunVoice['modelCompatibility']) || {},
      isCloned: v.is_cloned || false,
    }));

    return [...BUILTIN_VOICES, ...apiVoices];
  }
}
