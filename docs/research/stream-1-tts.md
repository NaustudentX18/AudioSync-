# Stream 1: Advanced TTS — Feature Research

**Objective:** Research super-detailed feature implementations to take AudioSync from a solid player to a world-class audiobook app.

**Date:** 2026-05-25
**Status:** Research Complete
**Current Baseline:** AudioSync uses Kokoro-82M (82M params, WASM/ONNX, offline-capable) with 12 bundled voices. OpenAI TTS available as optional cloud fallback.

---

## Table of Contents

1. [State of the Art (2025–2026)](#1-state-of-the-art-2025--2026)
2. [Feature Deep-Dive](#2-feature-deep-dive)
   - 2.1 [Voice Cloning / Fine-Tuning](#21-voice-cloning--fine-tuning)
   - 2.2 [SSML Support](#22-ssml-support)
   - 2.3 [Multi-Speaker Dialogue](#23-multi-speaker-dialogue)
   - 2.4 [Emotion / Expressiveness Controls](#24-emotion--expressiveness-controls)
   - 2.5 [Phoneme-Level Timing Alignment](#25-phoneme-level-timing-alignment)
   - 2.6 [Background Noise Reduction / Speech Enhancement](#26-background-noise-reduction--speech-enhancement)
   - 2.7 [Offline Voice Pack Management & Lazy Loading](#27-offline-voice-pack-management--lazy-loading)
3. [TTS Quality Benchmarks: Local vs Cloud](#3-tts-quality-benchmarks-local-vs-cloud)
4. [Implementation Roadmap](#4-implementation-roadmap)
5. [Risks & Blockers](#5-risks--blockers)

---

## 1. State of the Art (2025–2026)

### 1.1 Market Overview

The TTS market in 2025–2026 is experiencing a "Cambrian explosion" of use-cases. What was once confined to call centers is now powering voice AI agents, audiobook production, accessibility tools, and hands-free productivity applications. The global audiobook market reached ~$10 billion in 2025, growing at over 25% annually, with AI-driven TTS reducing production costs by >80% and compressing timelines from months to weeks.

**Three Main TTS Architecture Paradigms** (as of 2025):

| Architecture | Examples | Characteristics |
|---|---|---|
| **Codec Language Models (CLM)** | Dia-1.6B, CSM-1B | Discretizes audio into tokens, models with LMs; excellent for zero-shot voice cloning |
| **Diffusion-Based** | F5-TTS, MaskGCT | Iterative denoising; highest fidelity, higher compute cost |
| **Direct Waveform / Vocoder-Coupled** | Kokoro-82M, XTTS-v2, VITS | Generates mel-spectrograms → waveform; fastest inference, well-understood |

**Streaming TTS Modes:**

| Mode | Use Case | Latency |
|---|---|---|
| **Traditional** | Audiobooks, pre-scripted | ~3+ seconds (full text required) |
| **Output Streaming** | Real-time apps with complete text | ~1.5+ seconds |
| **Dual-Streaming** | Conversational AI, LLM voice agents | ~500+ ms (token-by-token) |

### 1.2 Key Market Players

**Cloud / API-Based (Managed):**

| Provider | ELO Rating | Languages | Pricing (per 1M chars) | Best For |
|---|---|---|---|---|
| **Realtime TTS 1.5-Max** (#1) | 1,236 | Multi | Custom | Real-time voice agents |
| **ElevenLabs v3** (#2) | 1,179 | 70+ | ~$120 | Audiobooks, creative |
| **OpenAI Realtime TTS 1** (#4) | 1,106 | Multi | ~$15 | Enterprise, conversational |
| **Cartesia Sonic 3** (#10) | ~1,054 | 15+ | ~$30 | Ultra-low latency (40ms TTFA) |
| **Google Cloud TTS** | N/A | 50+ | $16 | Multilingual apps |
| **Amazon Polly** | N/A | 29 | $16 | AWS-native, IVR |
| **Azure Neural TTS** | N/A | 140+ | Varies | Enterprise, on-prem |

**Open-Source / Local:**

| Model | Parameters | ELO | License | Key Feature |
|---|---|---|---|---|
| **Kokoro-82M** | 82M | 1,059 | Apache 2.0 | Lightweight, offline, WASM |
| **XTTS-v2** (Coqui) | ~1B+ | High | CPPL | Voice cloning, 17 languages |
| **Piper** | Varies | Mid | MIT | Fastest, Raspberry Pi optimized |
| **F5-TTS** | Large | High | Apache 2.0 | Diffusion-based, expressive |
| **VibeVoice-1.5B** | 1.5B | High | Research | Long-form (90 min), 4-speaker |
| **Fish Audio S2 Pro** | Large | High | Open weight | 48 emotion tags, Story Studio |
| **Orpheus-3B** | 3B | High | Open | Emotional, conversational |
| **CSM-1B** | 1B | High | Open | Well-rounded, controllable |

### 1.3 Audiobook-Specific Demands

Long-form content (8–12+ hours) introduces unique challenges not present in short-form TTS:

- **Voice Consistency:** Voice must remain stable across hours of generation — timbre, pacing, and emotional tone must not drift between chapters.
- **Emotional Range:** Thrillers need tension escalation; romances need nuance; business books need authority without monotony.
- **Chapter-Level Control:** Ability to regenerate specific chapters or paragraphs without re-generating the entire book.
- **Multi-Character Support:** Distinct vocal identities for dialogue characters, different tones for quotations/examples.
- **Platform Compliance:** ACX requires 192+ kbps MP3, 44.1 kHz, RMS -23 to -18 dB, peak < -3 dB.

---

## 2. Feature Deep-Dive

### 2.1 Voice Cloning / Fine-Tuning

#### Overview

Voice cloning replicates a speaker's vocal identity from a sample audio recording. Modern zero-shot approaches can clone from as little as 3–10 seconds of audio without fine-tuning. Fine-tuning approaches adapt a base model to a specific voice for higher fidelity.

#### Leading Solutions (2025–2026)

**Coqui XTTS-v2** *(current open-source gold standard for voice cloning)*
- **Languages:** 17 languages with cross-lingual voice cloning
- **Sample requirement:** 6-second audio clip for zero-shot cloning
- **Architecture:** VITS-based, decoder-only with voice conditioning
- **Quality:** Best open-source voice cloning quality; comparable to ElevenLabs at its best
- **Limitations:** Not actively maintained (community fork active); ~1B+ params, GPU recommended
- **Implementation:** Python (Coqui TTS library); also available via API
- **Complexity:** **Medium** — requires GPU for training/inference; ONNX export possible for edge

**ElevenLabs Instant Clone** *(commercial leader)*
- **Sample requirement:** As little as 1–3 minutes of clean audio for professional clone
- **Quality:** Industry-leading voice similarity and naturalness
- **Languages:** Multi-language with voice transfer
- **Pricing:** Professional tier ~$120/1M chars (API); Creator tier lower
- **Complexity:** **Low** — API only; no self-hosting

**OpenVoice** *(MIT-licensed, real-time)*
- **Sample requirement:** Short reference audio
- **Features:** Real-time voice conversion, cross-lingual
- **Quality:** Good for open-source; lags behind XTTS-v2 and ElevenLabs
- **Complexity:** **Low-Medium** — simpler than XTTS, good community support

**Mistral Open-Weight TTS** *(new entrant, March 2026)*
- **Features:** Cross-lingual voice cloning, preserves accents across languages
- **Deployment:** Local / self-hosted
- **Complexity:** **Medium** — newer, less mature ecosystem

**Chatterbox** *(highly rated in benchmarks)*
- **Voice cloning quality:** 63.75% match in blind tests (competitive with ElevenLabs)
- **Complexity:** **Medium** — newer, growing community

**RVC (Retrieval-based Voice Conversion)**
- **Use case:** Real-time voice conversion, not TTS per se
- **Quality:** Good for transformation, not for clean TTS
- **Complexity:** **Low** — simpler architecture

**XTTS-v2 vs XTTS-fork:**
> Note: Original Coqui XTTS-v2 is no longer actively maintained. The community fork (`coqui-ai-fork`) is the recommended path forward as of 2025.

#### Implementation Complexity

| Solution | Training Complexity | Inference Complexity | Hardware |
|---|---|---|---|
| XTTS-v2 (fork) | High (GPU, 10–20 hrs) | Medium (GPU preferred) | NVIDIA GPU 8GB+ VRAM |
| OpenVoice | Medium | Low-Medium | CPU or GPU |
| Piper (custom voice) | Low (few hours) | Very Low | CPU/Raspberry Pi |
| ElevenLabs API | None (API) | None (API) | None |
| Kokoro (no cloning) | N/A | Low | WASM/CPU |

#### Recommended Approach for AudioSync

**Phase 1 (Low Complexity):** Add ElevenLabs API as optional cloud TTS with voice cloning support. Users upload 1–3 min audio sample → API returns cloned voice ID. No local compute required.

**Phase 2 (Medium Complexity):** Integrate `coqui-ai-fork` XTTS-v2 via Python backend (FastAPI) for local voice cloning. Expose REST endpoint: `POST /api/tts/clone` with audio file → voice ID. Cache voice embeddings in IndexedDB.

**Phase 3 (High Complexity):** Implement voice fine-tuning pipeline for ultra-high fidelity. Train LoRA adapters on top of XTTS-v2 base. Persist fine-tuned models in local storage with versioning.

---

### 2.2 SSML Support

#### Overview

**SSML (Speech Synthesis Markup Language)** is a W3C-recommended XML-based standard for controlling TTS output. It enables fine-grained control over pronunciation, prosody, pauses, emphasis, pitch, rate, and volume on a per-word or per-phrase basis.

**Why SSML matters for audiobooks:** Audiobook narration requires dramatic pauses before chapter breaks, emphasis on key phrases, pronunciation corrections for character names/places, and rate adjustments for action vs. reflection scenes.

#### SSML Capabilities by Provider

| Element | Description | Cloud Support | Local Support |
|---|---|---|---|
| `<speak>` | Root element | ✅ All | ❌ None (custom impl) |
| `<break time="1s"/>` | Insert silence/pause | ✅ All | ❌ None |
| `<prosody rate="slow">` | Adjust speaking rate | ✅ All | ❌ None |
| `<prosody pitch="+2st">` | Adjust pitch | ✅ All | ❌ None |
| `<prosody volume="+3dB">` | Adjust volume | ✅ All | ❌ None |
| `<emphasis level="strong">` | Emphasize word/phrase | ✅ Most | ❌ None |
| `<phoneme>` | Custom pronunciation | ✅ Most | ❌ None |
| `<say-as>` | Interpret as date, number, etc. | ✅ Most | ❌ None |
| `<sub alias="...">` | Substitute pronunciation | ✅ Some | ❌ None |

**SSML Support Matrix:**

| Provider | SSML | Notes |
|---|---|---|
| **ElevenLabs** | ✅ Full | Well-implemented; recommended for audiobook SSML |
| **Google Cloud TTS** | ✅ Full | Extensive SSML documentation |
| **Amazon Polly** | ✅ Full | Includes Speech Marks for sync |
| **Azure Neural TTS** | ✅ Full | Custom neural voice supports SSML |
| **OpenAI TTS** | ⚠️ Limited | Limited SSML via prompt engineering |
| **Kokoro (local)** | ❌ None | No native SSML; requires pre-processing |

#### Local SSML Implementation Strategy

Local TTS engines (Kokoro, Piper) do **not** natively parse SSML. To add SSML support locally:

**Approach A: Pre-Processing Parser (Low Complexity)**
- Parse SSML in the browser/backend before sending text to TTS
- Replace SSML tags with modified text (e.g., insert "..." for `<break>`, use CAPS or punctuation for emphasis hints)
- Pros: Works with any TTS; Cons: Limited control

```typescript
// Pseudocode: SSML pre-processor
function ssmlToPlainText(ssml: string): string {
  // Remove tags but insert textual cues
  return ssml
    .replace(/<break\s+time="(\d+ms|[\d.]+s)"\s*\/>/g, ' ... ') // Pause as ellipsis
    .replace(/<prosody\s+rate="([^"]+)"[^>]*>([^<]*)<\/prosody>/g, (_, rate, text) => {
      if (rate.includes('slow')) return `[SLOWLY: ${text}]`;
      if (rate.includes('fast')) return `[QUICKLY: ${text}]`;
      return text;
    })
    .replace(/<[^>]+>/g, ''); // Strip remaining tags
}
```

**Approach B: Duration / Prosody Injection (Medium Complexity)**
- Kokoro-82M supports duration prediction but exposes no direct API
- Fork `kokoro-js` to inject prosody tokens at the phoneme level
- Requires understanding of Kokoro's internal token format

**Approach C: Hybrid — SSML for Cloud, Enhanced Prompts for Local (Recommended)**
- When using cloud TTS (ElevenLabs, OpenAI): pass SSML directly
- When using local TTS: convert SSML to prompt prefixes (e.g., `[narrator, slow, emphasized]`)
- Document limitation clearly to users

#### Implementation Complexity

| Approach | Complexity | Quality | Effort |
|---|---|---|---|
| Pre-processing parser | Low | Low-Medium | 4–8 hours |
| Duration injection (Kokoro fork) | High | High | 3–5 days |
| Hybrid (cloud SSML + prompt local) | Medium | Medium | 1–2 days |

**Recommended:** Hybrid approach. Users get full SSML with cloud TTS; local TTS gets prompt-based hints. Document the gap and plan SSML-native local engine for future (XTTS-v2 SSML branch or custom fork).

---

### 2.3 Multi-Speaker Dialogue

#### Overview

Multi-speaker TTS generates distinct voices for different characters within a single passage — critical for novels with dialogue, drama, or educational content with quotes/examples.

#### Current State

**Neural multi-speaker TTS is solved but fragmented:**

- **XTTS-v2:** Single-speaker output per generation; requires splitting text by speaker and running separate inference calls
- **ElevenLabs:** Supports speaker labels in text for multi-character output (experimental, quality inconsistent per reports)
- **Gemini TTS:** Supports multi-speaker prompts but reportedly ignores per-speaker voice settings in some configurations
- **VibeVoice-1.5B:** Purpose-built for multi-speaker (up to 4 speakers, 90 min continuous); currently research-only, English/Chinese only
- **FireRedTTS-2:** Long-form streaming multi-speaker system (research, 2025)

**Practical approach for audiobooks:** Text pre-processing to detect speaker turns, then batch-generate each speaker's lines with their assigned voice, then concatenate.

#### Speaker Detection Strategies

| Method | Quality | Complexity | Notes |
|---|---|---|---|
| **Regex / Heuristic** | Low | Very Low | Detect `"..."` patterns, dialogue tags (`he said`) |
| **Fine-tuned Classifier** | Medium | Medium | BERT-style classifier for speaker turn detection |
| **LLM-based** | High | Medium | Use existing LLM (Gemini) to annotate speakers |
| **Human-in-the-loop** | Highest | Low | User manually assigns voices; auto-detect as suggestion |

**Recommended hybrid:** LLM-based speaker detection (Gemini) with manual override. For each detected speaker segment, assign a voice model.

#### Implementation Pseudocode

```typescript
interface SpeakerSegment {
  text: string;
  speakerId: string;
  voiceId: string;
  startTime?: number;
  endTime?: number;
}

async function generateMultiSpeakerAudio(
  fullText: string,
  speakerVoiceMap: Record<string, string>
): Promise<AudioBuffer> {
  // 1. Detect speakers (LLM or heuristic)
  const segments: SpeakerSegment[] = await detectSpeakers(fullText);

  // 2. Generate audio for each segment
  const audioChunks: AudioBuffer[] = [];
  let currentTime = 0;

  for (const segment of segments) {
    const voice = speakerVoiceMap[segment.speakerId] || 'af_heart';
    const audio = await generateSpeech(segment.text, voice); // or stream
    segment.startTime = currentTime;
    currentTime += audio.duration;
    segment.endTime = currentTime;
    audioChunks.push(audio);
  }

  // 3. Concatenate with small crossfades to avoid clicks
  return concatenateAudioBuffers(audioChunks, { crossfadeMs: 10 });
}
```

#### Implementation Complexity

| Sub-Feature | Complexity | Effort |
|---|---|---|
| Speaker turn detection (heuristic) | Low | 4–8 hours |
| Speaker turn detection (LLM) | Medium | 1–2 days |
| Per-segment generation + concatenation | Low | 4 hours |
| Voice consistency / smoothing | Medium | 1–2 days |
| Overlap/crossfade handling | Low | 4 hours |

**Overall Complexity:** **Medium**
**Effort Estimate:** 1–2 weeks including speaker detection and concatenation with crossfades.

---

### 2.4 Emotion / Expressiveness Controls

#### Overview

Modern TTS can render emotional speech: happy, sad, angry, whispered, excited, sarcastic, etc. For audiobook narration, this is the difference between "reading" and "performing."

#### Emotional Control Mechanisms

**1. Prompt-Based Emotion (Current Standard)**
- Inject emotion cues into the text prompt or SSML
- Example (ElevenLabs): `[excited, whispering]` style tags in text
- Example (Fish Audio): 48 emotion tags + 5 tone tags + 10 special effects tags
- **Quality:** Good with commercial models; limited with open-source

**2. Reference-Based Emotion (Style Transfer)**
- Provide a reference audio clip with the desired emotional tone
- Model extracts prosody/style from reference and applies to generated speech
- Used by XTTS-v2 (style embedding), OpenVoice
- **Quality:** High; depends on reference quality

**3. Continuous Prosody Control**
- Direct manipulation of pitch contour, energy, and duration
- Used in VITS-based models with external prosody predictors
- **Quality:** Most precise but most complex

**4. Emotion Tags (Fish Audio / Specialized Models)**
- Predefined emotion vocabulary (48 tags in Fish Audio S1)
- Tags: `happy`, `sad`, `angry`, `surprised`, `scared`, `satisfied`, `excited`, `hesitating`, `sarcastic`, `comforting`, `embarrassed`, `proud`, `grateful`, `curious`, `confused`, `whispering`, `sighing`, `laughing`, `crying`, etc.
- **Quality:** Excellent for audiobook use-cases; granular control

#### Emotion Support by Engine

| Engine | Emotion Method | Granularity | Quality |
|---|---|---|---|
| **ElevenLabs** | Prompt/SSML tags | Medium | Excellent |
| **Fish Audio S1/S2** | 48 emotion tags | High | Excellent |
| **XTTS-v2** | Reference audio | Medium-High | Good |
| **Kokoro-82M** | None (fixed per voice) | None | N/A |
| **OpenVoice** | Reference audio | Medium | Good |
| **F5-TTS** | Prompt-based | Medium | Very Good |

#### Implementation Plan for AudioSync

**Phase 1 (Low-Medium):** Prompt-based emotion tags for cloud TTS only.
```typescript
const emotionPresets = {
  narrative: '',
  suspense: '[tense, slow]',
  action: '[fast, excited]',
  sad: '[sad, slow]',
  dialogue: '[conversational]',
  whisper: '[whispering]',
  laugh: '[laughing]'
};
```

**Phase 2 (Medium):** Reference audio upload for emotion/style cloning with XTTS-v2.
- User records 10–30 second reference clip for desired emotional tone
- Extract style embedding, cache with voice profile

**Phase 3 (High):** Full emotion tag system with Fish Audio integration or XTTS-v2 fork with emotion injection.

#### Implementation Complexity

| Phase | Complexity | Effort |
|---|---|---|
| Prompt tags (cloud only) | Low | 1 day |
| Reference audio + style embedding | Medium | 2–3 days |
| Emotion tag system (Fish Audio) | Medium | 2–3 days |

---

### 2.5 Phoneme-Level Timing Alignment

#### Overview

Phoneme-level timing alignment provides timestamps for each phoneme in generated speech. For audiobooks, this enables:

- **Word-level highlighting** (karaoke-style following along)
- **Chapter/section seeking** by text position
- **Subtitle generation** with precise timing
- **Lip-sync** for avatar/video integration
- **Reading position sync** between text and audio

#### How It Works

**Forced Alignment:** Given text + audio, compute the time boundaries of each phoneme. This is the reverse of TTS — TTS generates audio from text; alignment maps audio back to text.

**TTS-side Timing:** Some TTS engines expose timing during generation:
- **Inworld AI TTS:** Native timestamp alignment API
- **ElevenLabs:** No native phoneme timestamps; can use external alignment
- **Kokoro / XTTS:** No native timestamps

**External Alignment Libraries:**
- **aeneas:** Python/C library for forced audio-text alignment (GPL; be careful with licensing)
- **gentle:** Kaldi-based forced aligner (Python)
- **Montreal Forced Aligner (MFA):** Most accurate; Python; requires trained acoustic model

#### Recommended Approach

**For Cloud TTS (ElevenLabs / Inworld):**
```typescript
// Inworld AI provides timestamp API natively
const response = await tts.generate(text, {
  voice: 'narrator',
  timestamps: true // returns word/phoneme timestamps
});
// response.timestamps = [{ word: "Hello", start: 0.0, end: 0.5 }, ...]
```

**For Local TTS (Kokoro / XTTS):**
1. Generate audio
2. Run Montreal Forced Aligner (Python backend) on the generated audio + source text
3. Cache alignment results in IndexedDB alongside audio

```typescript
// Architecture
async function alignTextToAudio(text: string, audioBlob: Blob): Promise<PhonemeAlignment[]> {
  // Call Python backend service
  const response = await fetch('/api/align', {
    method: 'POST',
    body: JSON.stringify({ text, audioBase64: await blobToBase64(audioBlob) })
  });
  return response.json(); // [{ phoneme, startMs, endMs }, ...]
}
```

#### Implementation Complexity

| Approach | Complexity | Effort | Accuracy |
|---|---|---|---|
| Cloud TTS native timestamps | Low | 1 day | High |
| External forced aligner (aeneas/MFA) | Medium | 3–5 days | Very High |
| In-house alignment model | High | 2+ weeks | Variable |

**Recommended:** Cloud TTS native timestamps for cloud paths; MFA-backed Python service for local alignment. Total effort: ~1 week.

---

### 2.6 Background Noise Reduction / Speech Enhancement

#### Overview

For voice cloning, users may record reference audio in imperfect conditions (background noise, reverb, low-quality mic). Speech enhancement improves reference audio quality before voice cloning, and can clean up any generated TTS audio for distribution.

#### Key Techniques

**1. Noise Suppression (NS)**
- **Krisp:** Industry leader, real-time, AI-based
- **SpeechBrain:** Open-source speech enhancement models (MIT license)
- **WebRTC NS:** Lightweight, real-time, built into browsers
- **RNNoise:** Classic, lightweight (Xiph.Org)

**2. Dereverberation**
- Removes echo/reverb from recordings
- Used in pre-processing for voice cloning datasets

**3. Audio Preprocessing Pipeline for Voice Cloning**

```python
# Pseudocode: Pre-processing before voice cloning
import speechbrain as sb

def enhance_audio_for_cloning(audio_path: str) -> np.ndarray:
    # 1. Load audio
    audio, sr = load_audio(audio_path)

    # 2. Noise suppression (SpeechBrain)
    enhancer = sb.pretrained.EncoderDecoderSpeechEnhanced.from_hparams(
        source="speechbrain/sepformer-wsj02mix"
    )
    enhanced = enhancer.enhance_batch(audio.unsqueeze(0))

    # 3. Dereverberation (optional)
    enhanced = apply_dereverberation(enhanced)

    # 4. Normalize loudness
    enhanced = normalize_loudness(enhanced, target_lufs=-23)

    return enhanced
```

#### When to Apply Enhancement

| Stage | Reason | Complexity |
|---|---|---|
| **Voice cloning reference audio** | High impact: cleaner voice profiles | Low (pre-processing step) |
| **Generated TTS output** | Low impact: TTS audio is already clean | Low (post-processing step) |
| **User-recorded book notes** | Medium impact for note-taking features | Medium |

#### Implementation Complexity

| Solution | Complexity | Quality | Effort |
|---|---|---|---|
| WebRTC NS (browser) | Very Low | Good | 2–4 hours |
| SpeechBrain (Python backend) | Low | Very Good | 1–2 days |
| Custom DSP pipeline | Medium | Good | 3–5 days |

**Recommended:** SpeechBrain for reference audio pre-processing (Python backend); WebRTC NS for browser-side real-time noise suppression if adding voice recording features.

---

### 2.7 Offline Voice Pack Management & Lazy Loading

#### Overview

AudioSync currently bundles voice model weights in `public/voices/` (16 Kokoro models). As voice library grows (especially with custom cloned voices or additional TTS engines), efficient management becomes critical.

#### Current Architecture

- Kokoro models loaded from Hugging Face Hub (`onnx-community/Kokoro-82M-v1.0-ONNX`) at runtime
- 12 hardcoded voice IDs in `listVoices()`
- No lazy loading or caching strategy for voice packs
- No custom voice installation mechanism

#### Recommended Architecture

**Voice Pack Manifest:**
```json
{
  "version": "1.0",
  "voices": {
    "af_heart": {
      "id": "af_heart",
      "name": "Heart (Female)",
      "engine": "kokoro",
      "modelPath": "/voices/kokoro/af_heart.onnx",
      "sizeBytes": 15200000,
      "checksum": "sha256:abc123...",
      "metadata": { "gender": "female", "style": "warm", "language": "en" }
    },
    "custom_user_clone_001": {
      "id": "custom_user_clone_001",
      "name": "My Custom Voice",
      "engine": "xtts-v2",
      "modelPath": "/voices/xtts/custom_user_clone_001/",
      "sizeBytes": 128000000,
      "checksum": "sha256:def456...",
      "metadata": { "source": "user-cloned", "createdAt": "2026-01-15" }
    }
  }
}
```

**Lazy Loading Strategy:**

```typescript
class VoicePackManager {
  private loadedVoices = new Map<string, VoiceModel>();
  private cache: Cache; // Cache API

  async getVoice(voiceId: string): Promise<VoiceModel> {
    // Return cached if already loaded
    if (this.loadedVoices.has(voiceId)) {
      return this.loadedVoices.get(voiceId)!;
    }

    // Check IndexedDB for metadata
    const metadata = await this.getVoiceMetadata(voiceId);
    if (!metadata) throw new Error(`Voice ${voiceId} not found`);

    // Lazy load: fetch model weights only when needed
    const modelBuffer = await this.cache.match(metadata.modelPath)
      ?? await this.fetchAndCache(metadata.modelPath);

    const voice = this.instantiateVoice(metadata, modelBuffer);
    this.loadedVoices.set(voiceId, voice);
    return voice;
  }

  async prefetchVoices(voiceIds: string[]): Promise<void> {
    // Prefetch in background during idle time
    const promises = voiceIds.map(id => this.getVoice(id));
    await Promise.allSettled(promises);
  }
}
```

**Cache API Strategy:**
- Store voice model weights in Cache API (same-origin)
- Use `CacheStorage` for persistent offline voice cache
- Implement cache eviction (LRU) for limited storage environments
- Service worker can pre-cache voice packs on install

#### Voice Pack Installation (Custom Voices)

```typescript
interface VoiceInstallOptions {
  source: 'file' | 'url' | 'recording';
  format: 'xtts' | 'kokoro' | 'piper';
  metadata: VoiceMetadata;
}

async function installVoicePack(options: VoiceInstallOptions): Promise<string> {
  const voiceId = generateVoiceId();
  const voiceDir = `/voices/${options.format}/${voiceId}/`;

  // 1. Store model files in IndexedDB or Cache API
  // 2. Register in voice manifest
  // 3. Verify checksums
  // 4. Return voice ID

  await registerVoiceInManifest(voiceId, options.metadata);
  return voiceId;
}
```

#### Implementation Complexity

| Feature | Complexity | Effort |
|---|---|---|
| Voice manifest + registry | Low | 1 day |
| Lazy loading with Cache API | Medium | 2–3 days |
| Custom voice pack installer | Medium | 2–3 days |
| LRU cache eviction | Low | 1 day |
| Service worker pre-caching | Medium | 2 days |

**Overall Complexity:** **Medium**
**Effort Estimate:** 1–2 weeks.

---

## 3. TTS Quality Benchmarks: Local vs Cloud

### 3.1 Benchmark Landscape

**Primary Sources:**
- **Artificial Analysis Speech Arena Leaderboard:** Blind ELO-based rankings (most authoritative as of 2025)
- **Hugging Face TTS Arena:** Community-driven blind A/B testing
- **Inferless Comparative Benchmarks:** Latency and quality measurements
- **OCDevel Comparative Analysis:** Open-source vs proprietary comparisons

### 3.2 Quality Rankings (ELO Ratings, March 2026)

| Rank | Model | ELO | Type | Latency (TTFA) | Price (per 1M chars) |
|---|---|---|---|---|---|
| #1 | Realtime TTS 1.5-Max | 1,236 | Cloud | 130–250ms | Custom |
| #2 | ElevenLabs v3 | 1,179 | Cloud | ~200ms | ~$120 |
| #4 | OpenAI Realtime TTS 1 | 1,106 | Cloud | ~200ms | ~$15 |
| #10 | Cartesia Sonic 3 | ~1,054 | Cloud | 40ms | ~$50 |
| Open-weights #1 | Hugging Face Open Weights | 1,124 | Open | Varies | $15 |
| Open-weights #2 | Kokoro-82M | 1,059 | Open | <300ms | $0.70 |
| Open-weights #3 | CSM-1B | ~1,061 | Open | Medium | $15 |

**Price-Performance Analysis (ELO per dollar):**
- Realtime TTS 1.5-Mini: Best value (lowest cost, high quality)
- Inworld: ~73.7 ELO/$ (1,106 ELO / $15)
- ElevenLabs: ~9.8 ELO/$ (1,179 ELO / $120)
- Kokoro-82M: ~1,513 ELO/$ (1,059 ELO / $0.70) — *best absolute value*

### 3.3 Local vs Cloud: Head-to-Head

| Dimension | Cloud (ElevenLabs) | Local (Kokoro-82M) |
|---|---|---|
| **Quality** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Very Good |
| **Voice Cloning** | ⭐⭐⭐⭐⭐ Excellent | ❌ None (XTTS-v2 local: ⭐⭐⭐⭐) |
| **Latency** | 200ms + network | <300ms (WASM) |
| **Offline** | ❌ No | ✅ Yes |
| **Cost** | $$$ (scales with usage) | $ (one-time) |
| **Privacy** | Data leaves device | Fully private |
| **Languages** | 70+ | Limited (varies by model) |
| **Deployment** | API key required | Zero dependencies |
| **Voice Library** | 380+ voices | 12 bundled voices |
| **Customization** | Limited | Full control |

### 3.4 AudioSync-Specific Benchmarking Plan

**Test Matrix:**
```
Tests:
1. Single-sentence generation (5–20 words)
2. Paragraph generation (50–200 words)
3. Chapter generation (1000+ words)
4. Multi-speaker dialogue (4-way conversation)
5. Voice consistency across 1-hour continuous generation
6. Memory footprint (Chrome DevTools heap snapshot)
7. Battery impact (Android / mobile)
```

**Metrics to Collect:**
- Time-to-first-audio (TTFA)
- Total generation time per character count
- Memory usage (peak, sustained)
- CPU utilization
- Audio quality MOS (Mean Opinion Score) via listener test
- Voice drift (objective: cosine similarity of embeddings across chapters)

**Benchmarking Script:**
```typescript
async function benchmarkTTS(
  engine: 'kokoro' | 'elevenlabs' | 'xtts',
  testCases: BenchmarkCase[]
): Promise<BenchmarkResult> {
  const results = [];

  for (const test of testCases) {
    const startTime = performance.now();
    const audio = await generateSpeech(test.text, test.voice);
    const endTime = performance.now();

    results.push({
      textLength: test.text.length,
      duration: endTime - startTime,
      audioDuration: audio.duration,
      realtimeFactor: audio.duration / (endTime - startTime),
      memoryBefore: performance.memory?.usedJSHeapSize,
    });
  }

  return aggregateResults(results);
}
```

---

## 4. Implementation Roadmap

### 4.1 Prioritized Feature Matrix

| Feature | Complexity | Effort | Priority | Dependencies |
|---|---|---|---|---|
| **Voice cloning (ElevenLabs API)** | Low | 1–2 days | P1 | API key storage |
| **SSML for cloud TTS** | Medium | 1–2 days | P1 | SSML parser |
| **Phoneme timing (cloud native)** | Low | 1 day | P1 | Cloud TTS provider |
| **Multi-speaker (basic)** | Medium | 1–2 weeks | P1 | Speaker detection |
| **Emotion tags (cloud)** | Low | 1 day | P2 | Prompt engineering |
| **Voice pack lazy loading** | Medium | 1–2 weeks | P2 | Cache API |
| **Voice cloning (XTTS-v2 local)** | Medium | 1–2 weeks | P2 | Python backend, GPU |
| **Phoneme timing (local/MFA)** | Medium | 3–5 days | P2 | MFA Python service |
| **Emotion reference audio** | Medium | 2–3 days | P3 | XTTS style extraction |
| **Speech enhancement** | Low-Medium | 2–3 days | P3 | SpeechBrain (Python) |
| **Long-form voice consistency** | High | 2–3 weeks | P3 | TTS engine upgrade |
| **Full SSML (local)** | High | 3–5 days | P3 | Kokoro fork / XTTS fork |

### 4.2 Recommended Implementation Order

```
Phase 1 (Weeks 1–2) — Cloud-First Wins
├─ ElevenLabs API integration + voice cloning
├─ SSML pass-through for ElevenLabs
└─ Phoneme timestamps via Inworld/ElevenLabs native API

Phase 2 (Weeks 3–4) — Multi-Speaker Foundation
├─ Speaker turn detection (LLM-based)
├─ Per-speaker voice assignment
└─ Audio concatenation with crossfades

Phase 3 (Weeks 5–6) — Local Enhancement
├─ Voice pack lazy loading (Cache API)
├─ XTTS-v2 local voice cloning (Python backend)
└─ Emotion prompt tags (cloud + local prompt injection)

Phase 4 (Weeks 7–8) — Polish & Consistency
├─ Speech enhancement for reference audio
├─ Local phoneme alignment (MFA backend)
└─ Voice consistency validation across long-form
```

---

## 5. Risks & Blockers

### 5.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Voice drift in long-form** (Kokoro) | High | High | Evaluate Kokoro v1.1; add chapter reseeding; fallback to cloud |
| **XTTS-v2 licensing (CPPL)** | Medium | Medium | Ensure compliance; use XTTS-v2-fork with permissive license |
| **Local TTS quality gap** | High | Medium | Accept quality tradeoff; promote cloud TTS for production |
| **MFA alignment latency** | Medium | Low | Cache alignments; background processing |
| **Voice cloning memory** | High | High | Run XTTS on separate backend; stream results |
| **SSRM/SSML local gap** | High | Low | Document limitations; use hybrid approach |

### 5.2 Blockers

1. **Python backend required for XTTS-v2 / MFA / SpeechBrain**
   - Blocking local voice cloning and phoneme alignment
   - Mitigation: Stand up FastAPI service alongside Vite dev server

2. **GPU recommended for XTTS-v2 inference**
   - Pi hardware (ARM, no NVIDIA GPU) cannot realistically run XTTS-v2
   - Mitigation: Cloud fallback for voice cloning; local only on x86/GPU devices

3. **SSML local implementation is non-trivial**
   - No open-source local TTS engine has native SSML
   - Mitigation: Fork Kokoro or XTTS to add prosody injection; medium-term effort

### 5.3 Open Questions

- **Is dual-streaming TTS (token-by-token) needed for audiobook playback?** Probably not — audiobooks are pre-generated, not live. Traditional TTS is acceptable.
- **Can we implement real-time TTS for live reading (read-aloud) mode?** Yes, but requires dual-streaming architecture. Out of scope for current phase.
- **Should we support voice pack auto-updates?** Yes, but requires versioning strategy and user consent.
- **What is the memory budget for voice packs on mobile?** Need to test on actual mobile devices; estimate ~50MB per voice for ONNX format.

---

## Appendix: Key Libraries & Resources

### Open-Source TTS Libraries

| Library | Language | License | Repo |
|---|---|---|---|
| **kokoro-js** | JavaScript | Apache 2.0 | `github.com/Xenova/kokoro.js` |
| **coqui-ai-fork/TTS** | Python | CPPL (check fork) | `github.com/coqui-ai-fork/TTS` |
| **Piper** | C++/Python | MIT | `github.com/rhasspy/piper` |
| **F5-TTS** | Python | Apache 2.0 | `github.com/SWivid/F5-TTS` |
| **RealtimeTTS** | Python | MIT | `github.com/KoljaB/RealtimeTTS` |

### Audio Processing

| Library | Use | Language |
|---|---|---|
| **SpeechBrain** | Speech enhancement, NS | Python |
| **Montreal Forced Aligner** | Phoneme alignment | Python |
| **aeneas** | Audio-text forced alignment | Python/C |
| **Web Audio API** | Playback, chunking | Browser |
| **sox / ffmpeg** | Audio post-processing | CLI |

### Benchmarking

- **Artificial Analysis Speech Arena:** `artificialanalysis.ai/text-to-speech/leaderboard`
- **Hugging Face TTS Arena:** `huggingface.co/spaces/TTS-AGI/TTS-Arena`
- **TTS-ARXIV Daily:** `github.com/liutaocode/TTS-arxiv-daily`

---

*Document generated: 2026-05-25 | AudioSync Research — Stream 1: Advanced TTS*
