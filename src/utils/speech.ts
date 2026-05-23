import { VoiceModel } from "../types";
import { KokoroTTS } from "kokoro-js";

// Global cache for the Kokoro TTS model to avoid reloading on every request
let kokoroModelInstance: any = null;
let isKokoroLoading = false;

/**
 * Load Kokoro TTS model
 */
export async function loadKokoroModel() {
  if (kokoroModelInstance) return kokoroModelInstance;
  if (isKokoroLoading) {
    // Wait for the instance to finish loading by polling
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (kokoroModelInstance) {
          clearInterval(interval);
          resolve(kokoroModelInstance);
        }
      }, 100);
    });
  }
  isKokoroLoading = true;
  try {
    const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
    kokoroModelInstance = await KokoroTTS.from_pretrained(model_id, {
      dtype: "q8",
      device: "wasm",
    });
    isKokoroLoading = false;
    return kokoroModelInstance;
  } catch (error) {
    isKokoroLoading = false;
    console.error("Failed to load Kokoro model", error);
    throw new Error("Failed to initialize offline Kokoro TTS engine. Check console for details.");
  }
}

/**
 * Synthesize speech using the local offline Kokoro TTS engine via kokoro-js
 */
export async function synthesizeKokoro(
  text: string,
  voiceIdValue: string
): Promise<string> {
  const tts = await loadKokoroModel();

  const audioObj = await tts.generate(text, {
    voice: voiceIdValue,
  });

  // The generate function returns an object with `audio` array and `sampling_rate`.
  // Wait, let's look at kokoro-js docs: audio.save("audio.wav") exists.
  // We can convert the Audio object returned to a BlobURL using its buffer if possible, or use standard web audio API to play it.
  // Since we need to return a Blob URL, let's create a wav blob from raw data if necessary.

  // Let's assume audio has `.toBlob()` or we can construct it.
  // Alternatively, we can use the `save` method logic to create a URL.
  // A typical implementation in kokoro-js returns an audio object with a Blob if we call `.toBlob()` or similar.
  // Actually, the `audio.save()` method might just trigger download.
  // Let's create a wav Blob URL manually if needed.

  // Actually kokoro-js returns a Float32Array containing PCM audio data. We can wrap it into a WAV file.
  const audioData = audioObj.audio; // Float32Array
  const sampleRate = audioObj.sampling_rate;

  // Convert Float32Array to Int16Array
  const buffer = new ArrayBuffer(44 + audioData.length * 2);
  const view = new DataView(buffer);

  // Write WAV header
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + audioData.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, audioData.length * 2, true);

  // Write audio data
  const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };

  floatTo16BitPCM(view, 44, audioData);

  const blob = new Blob([view], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

/**
 * Synthesize speech using ElevenLabs TTS API directly from client using their BYO Key
 */
export async function synthesizeElevenLabs(
  text: string, 
  voiceIdValue: string, 
  apiKey: string
): Promise<string> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error("ElevenLabs API Key is missing. Add your key in the Speech Settings.");
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceIdValue}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": cleanKey,
    },
    body: JSON.stringify({
      text: text,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const serverMsg = errorBody?.detail?.message || "Unknown API issue";
    throw new Error(`ElevenLabs API Error: ${serverMsg} (Status: ${response.status})`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Synthesize speech using OpenAI TTS API directly from client using their BYO Key
 */
export async function synthesizeOpenAI(
  text: string, 
  voiceIdValue: string, 
  apiKey: string
): Promise<string> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error("OpenAI API Key is missing. Add your key in the Speech Settings.");
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${cleanKey}`,
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: voiceIdValue || "alloy",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const serverMsg = errorBody?.error?.message || "Unknown OpenAI issue";
    throw new Error(`OpenAI API Error: ${serverMsg} (Status: ${response.status})`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Native Browser Web Speech API synthesizer wrapped in standard format
 */
export function speakWebSpeech(
  text: string,
  voiceNameValue: string,
  speed: number,
  onBoundary: (charIndex: number) => void,
  onEnd: () => void,
  onError: (err: any) => void
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onError(new Error("Web Speech API not supported in this browser environment."));
    return null;
  }

  // Cancel any ongoing speaking queues
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = speed;
  utterance.pitch = 1.0;

  // Attempt to select the requested voice
  const availableVoices = window.speechSynthesis.getVoices();
  const selectedVoice = availableVoices.find(
    v => v.name.includes(voiceNameValue) || v.lang.includes(voiceNameValue)
  );

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.onboundary = (event) => {
    if (event.name === "word") {
      onBoundary(event.charIndex);
    }
  };

  utterance.onend = () => {
    onEnd();
  };

  utterance.onerror = (e) => {
    if (e.error !== "interrupted") {
      onError(e);
    }
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}
