import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  // Allow large payloads for image uploads (page OCR)
  app.use(express.json({ limit: "25mb" }));

  const PORT = 3000;

  // Lazy initialize GoogleGenAI if the key is available
  const getGeminiAI = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is missing on the server. Please add it via AI Studio Settings > Secrets.");
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  };

  // API endpoint for Web Scraping + AI Summarize/Extraction
  app.post("/api/import-link", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Fetch page content
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 sec timeout
      const pageRes = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!pageRes.ok) {
        throw new Error(`Failed to fetch page content. Status: ${pageRes.status}`);
      }

      const rawHtml = await pageRes.text();
      
      // Strip scripts, styles, and extra layout markup
      let cleanedText = rawHtml
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Enforce model input context limits (approx 40,000 chars)
      if (cleanedText.length > 40000) {
        cleanedText = cleanedText.substring(0, 40000) + "... [truncated]";
      }

      const ai = getGeminiAI();
      const prompt = `You are an expert article parsing and narrative engine. Analyze the scraped webpage text below and extract ONLY the main substantive article content (headline/title, content paragraphs, and author if available).
Strip out any cookie notifications, subscription requests, site navigation lists, footers, headers, ads, and irrelevant page components.
Deliver the results formatted strictly as a JSON object with this exact schema:
{
  "title": "Clean, descriptive article title",
  "author": "Author's name or null",
  "content": "Full, well-formatted article body text. Break into standard, paragraphs that scan elegantly for text-to-speech rendering.",
  "summary": "A high-quality 2-sentence summary/hook of the article."
}
Provide ONLY the JSON output. Do NOT wrap it in HTML blocks, markdown formatting, or explain anything.

Scraped content:
${cleanedText}`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const responseText = aiResponse.text || "{}";
      let parsedJson = {};
      try {
        const cleanJsonString = responseText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
        parsedJson = JSON.parse(cleanJsonString);
      } catch (err) {
        console.error("JSON parse failure on script model response:", responseText);
        // Fallback split for unstructured responses
        parsedJson = {
          title: "Parsed Link Article",
          content: responseText,
          summary: "Imported article narrative stream."
        };
      }

      res.json(parsedJson);
    } catch (error: any) {
      console.error("Import-link error:", error);
      res.status(500).json({ error: error.message || "Failed parsing the web link content." });
    }
  });

  // API endpoint for Vision Book & Page Snap Extraction (OCR)
  app.post("/api/scan-text", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const ai = getGeminiAI();
      const textPart = {
        text: "Scan this page capture image. Carefully extract the textual content. Reconstruct line breaks, repair typos, skip image captions or edge artifacts, and reply ONLY with the clean transcribed text body formatted beautifully and ready for reading aloud as a high-fidelity audiobook chapter."
      };
      
      const imagePart = {
        inlineData: {
          data: image,
          mimeType: mimeType || "image/jpeg"
        }
      };

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] }
      });

      res.json({ text: aiResponse.text || "" });
    } catch (error: any) {
      console.error("Scan-text error:", error);
      res.status(500).json({ error: error.message || "Something went wrong during image scanning OCR." });
    }
  });

  // API endpoint to generate high-quality listening drafts / custom scripts
  app.post("/api/generate-script", async (req, res) => {
    try {
      const { topic, style } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const ai = getGeminiAI();
      const prompt = `Write a beautiful, highly immersive, narrative script on the topic or prompt "${topic}" using a style of "${style || "storytelling & educational"}".
Configure this script specifically for a premium audiobook vocal performance. Use evocative language, structural flow, and rhythmic vocal cues. Length should be 250 to 450 words.
Structure the text as:
# Title: [Insert Creative Title]
[Content paragraphs]`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      res.json({ text: aiResponse.text || "" });
    } catch (error: any) {
      console.error("Generate-script error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI audio script." });
    }
  });

  // Serve static UI assets or mount Vite hot-middleware during active dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AuraReader server initialized on http://0.0.0.0:${PORT}`);
  });
}

startServer();
