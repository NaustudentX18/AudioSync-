import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

export const genAI = new GoogleGenAI({ apiKey: apiKey || '' });

export async function summarizeText(text: string) {
  if (!apiKey) {
    return "Gemini API key not configured. Add it to .env to enable summaries.";
  }

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Summarize this audiobook excerpt in 2-3 sentences:\n\n${text}`,
  });

  return response.text || "No summary generated.";
}

export async function detectChapters(text: string) {
  if (!apiKey) return [];

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Extract chapter titles from this text. Return as a JSON array of strings.\n\n${text}`,
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch {
    return [];
  }
}
