import { VoiceModel } from "../types";

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
