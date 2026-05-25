import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

dotenv.config();
const execFileAsync = promisify(execFile);

async function startServer() {
  const app = express();
  // Allow large payloads for image uploads (page OCR)
  app.use(express.json({ limit: "25mb" }));

  const PORT = 3002;

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

  

  // Audiobookshelf sync connector baseline
  app.post("/api/sync/audiobookshelf", async (req, res) => {
    try {
      const { payload } = req.body || {};
      if (!payload) return res.status(400).json({ error: "payload is required" });

      const baseUrl = process.env.AUDIOBOOKSHELF_URL;
      const token = process.env.AUDIOBOOKSHELF_TOKEN;
      if (!baseUrl || !token) {
        return res.status(503).json({
          error: "Audiobookshelf connector not configured",
          hint: "Set AUDIOBOOKSHELF_URL and AUDIOBOOKSHELF_TOKEN on server",
        });
      }

      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/libraries`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return res.status(502).json({ error: `Audiobookshelf probe failed: ${response.status}` });
      }

      // Baseline connector acknowledgement; deeper import mapping to be extended later
      return res.json({ ok: true, message: "Connector reachable", bytes: JSON.stringify(payload).length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Audiobookshelf sync failed" });
    }
  });



  // Backend conversion/extraction endpoints for MOBI/FB2/PDF
  app.post("/api/extract/pdf", async (req, res) => {
    try {
      const { filePath } = req.body || {};
      if (!filePath) return res.status(400).json({ error: "filePath is required" });

      const { stdout } = await execFileAsync("pdftotext", [filePath, "-"]);
      return res.json({ text: stdout || "" });
    } catch (error: any) {
      return res.status(500).json({
        error: "PDF extraction failed",
        hint: "Install pdftotext (poppler-utils) or provide plain text fallback",
        detail: error.message,
      });
    }
  });

  app.post("/api/convert/ebook", async (req, res) => {
    try {
      const { inputPath, outputPath } = req.body || {};
      if (!inputPath || !outputPath) {
        return res.status(400).json({ error: "inputPath and outputPath are required" });
      }

      await execFileAsync("ebook-convert", [inputPath, outputPath]);
      return res.json({ ok: true, outputPath });
    } catch (error: any) {
      return res.status(500).json({
        error: "Ebook conversion failed",
        hint: "Install Calibre ebook-convert for MOBI/FB2 pipelines",
        detail: error.message,
      });
    }
  });



  app.get("/api/capabilities", async (_req, res) => {
    const checks = [
      { name: 'ebook-convert', cmd: 'ebook-convert', args: ['--version'] },
      { name: 'pdftotext', cmd: 'pdftotext', args: ['-v'] },
    ];

    const results: Record<string, boolean> = {};
    for (const check of checks) {
      try {
        await execFileAsync(check.cmd, check.args);
        results[check.name] = true;
      } catch {
        results[check.name] = false;
      }
    }

    res.json({ tools: results });
  });



  app.post("/api/sync/audiobookshelf/map", async (req, res) => {
    try {
      const { payload } = req.body || {};
      if (!payload?.books || !Array.isArray(payload.books)) {
        return res.status(400).json({ error: 'payload.books is required' });
      }

      const mapped = payload.books.map((b: any) => ({
        title: b.title,
        author: b.author || 'Unknown',
        description: (b.content || '').slice(0, 1000),
        tags: b.tags || [],
      }));

      return res.json({ ok: true, count: mapped.length, mappedPreview: mapped.slice(0, 5) });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Mapping failed' });
    }
  });



  app.post("/api/sync/audiobookshelf/push", async (req, res) => {
    try {
      const { payload, dryRun = true } = req.body || {};
      if (!payload?.books || !Array.isArray(payload.books)) {
        return res.status(400).json({ error: 'payload.books is required' });
      }

      const baseUrl = process.env.AUDIOBOOKSHELF_URL;
      const token = process.env.AUDIOBOOKSHELF_TOKEN;
      if (!baseUrl || !token) {
        return res.status(503).json({ error: 'Audiobookshelf connector not configured' });
      }

      const mapped = payload.books.map((b: any) => ({
        title: b.title,
        author: b.author || 'Unknown',
        description: (b.content || '').slice(0, 1000),
        tags: b.tags || [],
      }));

      if (dryRun) {
        return res.json({ ok: true, dryRun: true, count: mapped.length, mappedPreview: mapped.slice(0, 3) });
      }

      const libraryRes = await fetch(`${baseUrl.replace(/\/$/, '')}/api/libraries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!libraryRes.ok) {
        return res.status(502).json({ error: `Audiobookshelf libraries fetch failed: ${libraryRes.status}` });
      }
      const librariesData = await libraryRes.json();
      const firstLibrary = librariesData?.libraries?.[0] || librariesData?.[0];
      const libraryId = firstLibrary?.id;
      if (!libraryId) return res.status(502).json({ error: 'No target library found' });

      // Minimal write path: push metadata as a sync event note to custom endpoint if available.
      // If endpoint not available, return mapped payload so caller can proceed with manual import.
      const pushEndpoint = `${baseUrl.replace(/\/$/, '')}/api/sync`; // may not exist on all versions
      const pushRes = await fetch(pushEndpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ libraryId, items: mapped }),
      }).catch(() => null as any);

      if (!pushRes || !pushRes.ok) {
        return res.status(200).json({
          ok: true,
          pushed: false,
          reason: 'Direct push endpoint unavailable; returning mapped payload for manual import',
          libraryId,
          count: mapped.length,
          mapped,
        });
      }

      return res.json({ ok: true, pushed: true, libraryId, count: mapped.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Audiobookshelf push failed' });
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
