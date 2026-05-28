# StepFun StepAudio TTS API — Structured Spec for AudioSync Integration

**Research Date:** 2026-05-25  
**API Version:** v1 (as of May 2026)  
**Base URL:** `https://api.stepfun.ai/v1`  
**Authentication:** `Authorization: Bearer <STEP_API_KEY>` header

---

## 1. Available TTS Models

| Model ID | Type | Pricing (per 10K chars) | Max Chars | Key Features | voice_label Support | instruction Support |
|----------|------|------------------------|-----------|--------------|---------------------|---------------------|
| `stepaudio-2.5-tts` | Contextual TTS | $0.85 | 1000 | True vocal performance, global + inline context control, zero-shot clone (~3s audio) | ❌ No | ✅ Yes (max 200 chars) |
| `step-tts-2` | Standard TTS | $0.40 | 1000 | 11 emotions, 17 styles, 3 languages, zero-cost emotion/style on cloned voices, accent-faithful cloning (~10s audio) | ✅ Yes | ❌ No |
| `step-tts-mini` | Lightweight TTS | Not listed (likely free/cheaper) | 1000 | Same emotion/style controls as step-tts-2, 3 languages | ✅ Yes | ❌ No |

**Notes:**
- Pricing: One Chinese character = 1 char; two English letters = 1 char; two punctuation marks = 1 char.
- Voice cloning cost: $1.50 per voice (applies to stepaudio-2.5-tts and step-tts-2).
- All models support output formats: `wav`, `mp3`, `flac`, `opus`, `pcm` (default: `mp3`).
- All models support sample rates: 8000, 16000, 22050, 24000 (default), 48000 Hz.
- stepaudio-2.5-tts: Text inside parentheses `()` is treated as instruction and NOT spoken. Use for inline context.

---

## 2. Built-in Voices (Official)

### Voice Compatibility Matrix

| Voice ID | Name | Gender | Languages | step-2.5 | step-tts-2 | step-tts-mini | Scenarios |
|----------|------|--------|-----------|----------|------------|---------------|-----------|
| `lively-girl` | Lively Girl | Female | EN/ZH | ✅ | ✅ | ❌ | Audiobook |
| `livelybreezy-female` | Lively Breezy | Female | EN/ZH | ✅ | ✅ | ✅ | Marketing, Customer Service, Emotional, Voice Assistant |
| `zhengpaiqingnian` | Upright Youth | Neutral | ZH | ✅ | ✅ | ✅ | Marketing, Audiobook |
| `shuangkuainansheng` | Straightforward Male | Male | ZH | ✅ | ✅ | ❌ | Customer Service |
| `ganliannvsheng` | Capable Female | Female | ZH | ✅ | ✅ | ❌ | Customer Service |
| `qinhenvsheng` | Warm Female | Female | ZH | ✅ | ✅ | ❌ | Customer Service |
| `huolinvsheng` | Energetic Female | Female | ZH | ✅ | ✅ | ❌ | Customer Service |
| `elegantgentle-female` | Elegant Gentle | Female | EN/ZH | ✅ | ✅ | ✅ | Customer Service, Emotional, Voice Assistant |
| `wenrounansheng` | Gentle Male | Male | ZH | ✅ | ✅ | ✅ | Customer Service, Emotional |
| `jingdiannvsheng` | Classic Female | Female | ZH | ✅ | ✅ | ✅ | Customer Service |
| `wenroushunv` | Mature Gentle | Female | ZH | ✅ | ✅ | ✅ | Customer Service |
| `tianmeinvsheng` | Sweet Female | Female | ZH | ✅ | ✅ | ✅ | Customer Service, Emotional |
| `qingchunshaonv` | Pure Girl | Female | ZH | ✅ | ✅ | ✅ | Customer Service, Emotional, Voice Assistant |
| `yuanqinansheng` | Spirited Male | Male | ZH | ✅ | ✅ | ✅ | Customer Service, Audiobook |
| `ruyananshi` | Scholarly Gentleman | Male | ZH | ✅ | ✅ | ✅ | Audiobook, Emotional, Voice Assistant |
| `wenrounvsheng` | Gentle Female | Female | ZH | ✅ | ✅ | ✅ | Audiobook, Emotional |
| `wenrougongzi` | Tender Gentleman | Male | ZH | ✅ | ✅ | ✅ | Audiobook, Emotional |
| `cixingnansheng` | Magnetic Male | Male | ZH | ✅ | ✅ | ✅ | Audiobook, Emotional |
| `yuanqishaonv` | Spirited Girl | Female | ZH | ✅ | ✅ | ✅ | Audiobook, Emotional |
| `boyinnansheng` | Broadcast Male | Male | ZH | ✅ | ✅ | ✅ | Audiobook |
| `shenchennanyin` | Deep Male | Male | ZH | ✅ | ✅ | ✅ | Audiobook |
| `soft-spoken-gentleman` | Soft-spoken Gentleman | Male | EN | ✅ | ✅ | ❌ | Emotional |
| `qinqienvsheng` | Friendly Female | Female | ZH | ✅ | ✅ | ✅ | Emotional |
| `linjiajiejie` | Girl Next Door | Female | ZH | ✅ | ✅ | ✅ | Emotional, Video Dubbing, Voice Assistant |
| `jilingshaonv` | Clever Girl | Female | ZH | ✅ | ✅ | ✅ | Voice Assistant |
| `linjiameimei` | Kid Sister | Female | ZH | ✅ | ✅ | ✅ | Voice Assistant |
| `zhixingjiejie` | Intellectual Lady | Female | ZH | ✅ | ✅ | ✅ | Voice Assistant |
| `vibrant-youth` | Vibrant Youth | Neutral | EN | ✅ | ✅ | ❌ | Video Dubbing |
| `magnetic-voiced-male` | Magnetic-voiced Male | Male | EN | ✅ | ✅ | ❌ | Video Dubbing |
| `qingniandaxuesheng` | College Student | Male | ZH | ✅ | ✅ | ✅ | Video Dubbing |
| `ruanmengnvsheng` | Cute Soft Female | Female | ZH | ✅ | ✅ | ✅ | Video Dubbing, Emotional |
| `youyanvsheng` | Elegant Female | Female | ZH | ✅ | ✅ | ✅ | Video Dubbing |

**Total documented voices:** 32+ (list may not be exhaustive; use List Voices API for cloned voices)

---

## 3. Voice Tags (Emotion & Style Control)

**Applicable to:** `step-tts-2` and `step-tts-mini` only.  
**Constraint:** Only ONE of `language`, `emotion`, or `style` can be set per request.  
**stepaudio-2.5-tts:** Does NOT support `voice_label`; use `instruction` instead.

### 3.1 Languages
- `Cantonese`
- `Sichuanese` (四川话)
- `Japanese`

### 3.2 Emotions (15 total)
| Tag | Description |
|-----|-------------|
| `happy` | Expressing happiness |
| `angry` | Expressing anger |
| `sad` | Expressing sadness |
| `fear` | Expressing fear |
| `surprised` | Expressing surprise |
| `confusion` | Expressing confusion |
| `empathy` | Expressing empathy and understanding |
| `embarrass` | Expressing embarrassment |
| `excited` | Expressing excitement and enthusiasm |
| `depressed` | Expressing a depressed or discouraged mood |
| `admiration` | Expressing admiration or respect |
| `coldness` | Expressing coldness and indifference |
| `disgusted` | Expressing disgust or aversion |
| `humour` | Expressing humor or playfulness |

### 3.3 Speaking Styles (30+ total)
| Tag | Description |
|-----|-------------|
| `serious` | Speaking in a serious or solemn manner |
| `arrogant` | Speaking in an arrogant manner |
| `child` | Speaking in a childlike manner |
| `older` | Speaking in an elderly-sounding manner |
| `girl` | Speaking in a light, youthful feminine manner |
| `pure` | Speaking in a pure, innocent manner |
| `sister` | Speaking in a mature, confident feminine manner |
| `sweet` | Speaking in a sweet, lovely manner |
| `exaggerated` | Speaking in an exaggerated, dramatic manner |
| `ethereal` | Speaking in a soft, airy, dreamy manner |
| `whisper` | Speaking in a whispering, very soft manner |
| `generous` | Speaking in a hearty, outgoing, and straight-talking manner |
| `recite` | Speaking in a clear, well-paced, poetry-reading manner |
| `act_coy` | Speaking in a sweet, playful, and endearing manner |
| `warm` | Speaking in a warm, friendly manner |
| `shy` | Speaking in a shy, timid manner |
| `comfort` | Speaking in a comforting, reassuring manner |
| `authority` | Speaking in an authoritative, commanding manner |
| `chat` | Speaking in a casual, conversational manner |
| `radio` | Speaking in a radio-broadcast manner |
| `soulful` | Speaking in a heartfelt, deeply emotional manner |
| `gentle` | Speaking in a gentle, soft manner |
| `story` | Speaking in a narrative, audiobook-style manner |
| `vivid` | Speaking in a lively, expressive manner |
| `program` | Speaking in a show-host/presenter manner |
| `news` | Speaking in a news broadcasting manner |
| `advertising` | Speaking in a polished, high-end commercial voiceover manner |
| `roar` | Speaking in a loud, deep, roaring manner |
| `murmur` | Speaking in a quiet, low manner |
| `shout` | Speaking in a loud, sharp, shouting manner |
| `deeply` | Speaking in a deep and low-pitched tone |
| `loudly` | Speaking in a loud and high-pitched tone |

**Note:** The official docs mention "11 emotions, 17 styles" for step-tts-2 and "17 styles" for step-tts-mini. The open-source Step-Audio-EditX lists more (30+ styles), which may be available via the API as well. Implementations should allow any string value but validate against known tags for UI.

---

## 4. Voice Cloning API

### 4.1 Upload Reference Audio

**Endpoint:** `POST https://api.stepfun.ai/v1/files`  
**Content-Type:** `multipart/form-data`

**Request Body:**
- `purpose` (string, required): Must be `"storage"`
- `file` (File, optional): The audio file (mp3 or wav). For voice cloning: 5–10 seconds duration recommended.
- `url` (string, optional): Remote file URL (alternative to file upload). If both provided, `file` takes precedence.

**Constraints:**
- Max file size: 128 MB
- Supported audio formats: mp3, wav
- Each user can upload up to 1,000 files

**Response (File Object):**
```json
{
  "id": "file-abc123",
  "object": "file",
  "bytes": 140,
  "created_at": 1613779121,
  "filename": "reference.wav",
  "purpose": "storage",
  "status": "processed"
}
```

### 4.2 Create Cloned Voice

**Endpoint:** `POST https://api.stepfun.ai/v1/audio/voices`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "model": "step-tts-2",          // Required: "step-tts-2" or "step-tts-mini"
  "file_id": "file-abc123",       // Required: from upload response
  "text": "Transcript...",        // Optional: transcript of reference audio (recommended)
  "sample_text": "Preview text"   // Optional: max 50 chars, used for preview
}
```

**Response:**
```json
{
  "id": "voice-tone-xyz",         // Voice ID for subsequent TTS
  "object": "audio.voice",
  "duplicated": false,            // true if same voice already exists
  "sample_text": "Preview text",
  "sample_audio": "base64-wav"    // Preview audio in base64 (WAV format)
}
```

**Notes:**
- Audio length: 5–10 seconds for optimal cloning.
- Cloned voices inherit full emotion/style controls (zero additional cost).
- stepaudio-2.5-tts is NOT supported for voice cloning (only step-tts-2 and step-tts-mini).

### 4.3 Voice Preview (Without Creating Voice)

**Endpoint:** `POST https://api.stepfun.ai/v1/audio/voices/preview`  
**Use case:** Quick verification of cloning quality without permanent voice creation.

**Request Body:**
```json
{
  "model": "stepaudio-2.5-tts",   // Required
  "file_id": "file-abc123",       // Required
  "text": "Full transcript...",   // Optional (ASR used if omitted)
  "sample_text": "Test phrase",   // Required (recommend <50 chars)
  "response_format": "mp3",       // Optional: wav, mp3, flac, opus, pcm
  "speed": 1.0,                   // Optional: 0.5–2.0
  "volume": 1.0,                  // Optional: 0.1–2.0
  "voice_label": {                // Optional: ONLY ONE of language/emotion/style
    "emotion": "happy"
  },
  "instruction": "Gentle tone",   // Optional: ONLY for stepaudio-2.5-tts, max 200 chars
  "sample_rate": 24000,           // Optional: 8000, 16000, 22050, 24000, 48000
  "pronunciation_map": {          // Optional
    "tone": ["LOL/laugh out loud"]
  },
  "markdown_filter": false        // Optional
}
```

**Response:**
```json
{
  "sample_text": "Test phrase",
  "sample_audio": "base64-wav-data",
  "request_id": "req-123"
}
```

---

## 5. Text-to-Speech API

### 5.1 Standard (Batch) Synthesis

**Endpoint:** `POST https://api.stepfun.ai/v1/audio/speech`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "model": "step-tts-2",           // Required
  "input": "Text to speak...",     // Required, max 1000 chars
  "voice": "lively-girl",          // Required: built-in voice ID or cloned voice ID
  "response_format": "mp3",        // Optional: wav, mp3, flac, opus, pcm
  "speed": 1.0,                    // Optional: 0.5–2.0
  "volume": 1.0,                   // Optional: 0.1–2.0
  "voice_label": {                 // Optional: ONLY ONE; stepaudio-2.5-tts will error if passed
    "emotion": "happy"             // or "style": "...", or "language": "..."
  },
  "instruction": "...",            // Optional: ONLY for stepaudio-2.5-tts, max 200 chars
  "sample_rate": 24000,            // Optional
  "pronunciation_map": {           // Optional
    "tone": ["word/pronunciation"]
  },
  "stream_format": "audio",        // Optional: "audio" (default) or "sse" for streaming
  "markdown_filter": false,        // Optional
  "return_url": false              // Optional: if true, returns { url: "..." } instead of audio
}
```

**Response:**
- Direct binary audio (if `stream_format=audio` or default)
- SSE stream (if `stream_format=sse`): `data: {"type":"speech.audio.delta","audio":"<base64>"}` chunks, ending with `data: {"type":"speech.audio.done"}` and `data: [DONE]`
- JSON with URL (if `return_url=true`): `{ "url": "https://...", "duration": 12.5, "size": 12345 }`

### 5.2 Streaming (WebSocket)

**Endpoint:** `wss://api.stepfun.ai/v1/audio/ws` (per API reference list)  
**Note:** SSE via `stream_format=sse` is simpler and recommended for web use.

---

## 6. File Upload API (Detailed)

**Endpoint:** `POST https://api.stepfun.ai/v1/files`  
**Auth:** Bearer token

**Request (multipart/form-data):**
```
Content-Type: multipart/form-data; boundary=---

purpose: storage
file: <binary data>
```

**Response:** File object (see §4.1)

**Python SDK example:**
```python
from openai import OpenAI
client = OpenAI(api_key="STEP_API_KEY", base_url="https://api.stepfun.ai/v1")
client.files.create(file=open("audio.wav", "rb"), purpose="storage")
```

---

## 7. Pricing Tiers

### 7.1 Speech Models (Pay-as-you-go)

| Model | Price | Notes |
|-------|-------|-------|
| `stepaudio-2.5-tts` | $0.85 / 10,000 characters | Contextual TTS |
| `step-tts-2` | $0.40 / 10,000 characters | Standard TTS |
| Voice cloning | $1.50 / voice | One-time fee per cloned voice |
| `stepaudio-2.5-asr` | $0.022 / hour | Speech recognition (not TTS) |

### 7.2 Account Tiers (Rate Limits by Cumulative Top-Up)

| Tier | Min Top-Up | Concurrency | RPM | TPM |
|------|------------|--------------|-----|-----|
| V0 | $0 | 5 | 10 | 5,000,000 |
| V1 | $15 | 100 | 1,000 | 20,000,000 |
| V2 | $70 | 200 | 5,000 | 30,000,000 |
| V3 | $300 | 400 | 10,000 | 40,000,000 |
| V4 | $700 | 1,000 | 20,000 | 50,000,000 |
| V5 | $1,500 | 10,000 | 200,000 | 100,000,000 |

**Definitions:**
- **Concurrency:** Number of simultaneous requests
- **RPM:** Requests per minute
- **TPM:** Tokens per minute (characters count toward tokens)

**Notes:**
- Rate limits ensure fair resource allocation.
- Contact `platform@stepfun.com` for higher limits.
- Throttling may occur during capacity constraints.

---

## 8. Error Handling

Common HTTP status codes:
- `400`: Invalid request (e.g., voice_label with stepaudio-2.5-tts, text > 1000 chars)
- `401`: Invalid API key
- `429`: Rate limit exceeded
- `500`: Server error

**StepFun-specific errors:** The API follows OpenAI-compatible error format:
```json
{
  "error": {
    "message": "Detailed error message",
    "type": "invalid_request_error",
    "param": null,
    "code": null
  }
}
```

---

## 9. Integration Notes for AudioSync

### 9.1 Provider Architecture
- Add `stepfun` as a new TTS provider alongside `kokoro` and `openai`.
- Unified interface: `generateSpeech(text, voiceId, model?) → Promise<Uint8Array>`
- `listVoices(model?) → Promise<StepFunVoice[]>`
- `cloneVoice(name, referenceAudioBlob, description?) → Promise<{voiceId: string}>`
- `previewVoice(voiceId, text) → Promise<Blob>`

### 9.2 Settings Storage
- Store API key encrypted in localStorage using existing `secureStorage` module.
- Settings: `ttsProvider` ('kokoro' | 'openai' | 'stepfun'), `stepfunApiKey`, `stepfunModel`.
- Default model: `step-tts-2` (balance of cost and features).

### 9.3 Voice Management
- Maintain a list of built-in StepFun voices in `src/data.ts` (or fetch dynamically from docs).
- Cloned voices stored separately; fetch via `GET /v1/audio/voices`.
- UI should allow selecting voice, optional emotion/style/language tags (for step-tts-2/mini), or instruction (for stepaudio-2.5-tts).

### 9.4 Error Handling
- Network failures: retry with exponential backoff (max 3 retries).
- 401: Prompt user to re-enter API key.
- 429: Implement rate limit backoff; show "quota exceeded" message if persistent.
- 400: Validate inputs client-side before sending.

---

## 10. Open Questions / Future Work

- **Streaming WebSocket:** Full implementation deferred; SSE is sufficient for initial integration.
- **Dynamic voice list:** Could fetch `GET /v1/audio/voices` for cloned voices only; built-in list is static.
- **step-tts-mini pricing:** Not explicitly listed; assume similar to step-tts-2 or free tier.
- **Free tier:** StepFun may offer a free quota (check Step Plan details). Implementation should handle `402 Payment Required` if applicable.

---

*End of spec*
