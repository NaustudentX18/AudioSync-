import React, { useState, useRef } from "react";
import { BookItem } from "../types";
import { 
  FileText, Link2, Camera, HelpCircle, Loader2, Sparkles, 
  ArrowRight, Check, AlertCircle, UploadCloud 
} from "lucide-react";

interface ImportContentFormProps {
  onAddBook: (book: BookItem) => void;
}

const GRADIENTS = [
  "from-amber-600 via-yellow-600 to-amber-900",
  "from-emerald-600 via-teal-700 to-emerald-950",
  "from-rose-600 via-pink-600 to-rose-950",
  "from-indigo-600 via-violet-700 to-indigo-950",
  "from-cyan-600 via-blue-600 to-cyan-950",
  "from-purple-600 via-fuchsia-600 to-purple-950",
];

export default function ImportContentForm({ onAddBook }: ImportContentFormProps) {
  const [activeTab, setActiveTab] = useState<"write" | "file" | "scan" | "link">("write");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // TAB 1: Write Custom text / AI Assist
  const [textTitle, setTextTitle] = useState<string>("");
  const [textContent, setTextContent] = useState<string>("");
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);

  // TAB 3: Scan Image (OCR)
  const [scanImageBase64, setScanImageBase64] = useState<string | null>(null);
  const [scanMimeType, setScanMimeType] = useState<string>("image/jpeg");
  const scanInputRef = useRef<HTMLInputElement>(null);

  // TAB 4: Scrape Web Link
  const [scrapeUrl, setScrapeUrl] = useState<string>("");

  // Helper: triggers a success animation banner
  const triggerSuccess = (message: string) => {
    setSuccessMsg(message);
    setErrorMsg(null);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  // Dispatch fully compliant Book item to upper system
  const generateAndSaveBook = (title: string, author: string | null, content: string, summary: string) => {
    const randomGrad = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
    // Rough estimate: 150 words per minute average reading speed
    const wordsCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const estimatedDuration = Math.max(Math.round((wordsCount / 140) * 60), 30);

    const newBook: BookItem = {
      id: `book-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: title.trim() || "Untitled Import",
      author: author ? author.trim() : "Me",
      content: content.trim(),
      summary: summary.trim() || `Imported script containing ${wordsCount} words.`,
      coverGradient: randomGrad,
      dateAdded: new Date().toISOString().split("T")[0],
      durationSeconds: estimatedDuration,
      progressSeconds: 0,
    };

    onAddBook(newBook);
    return newBook;
  };

  // ACTION: Save Written text
  const handleSaveWritten = () => {
    if (!textTitle) {
      setErrorMsg("Please provide a title for your custom writing draft.");
      return;
    }
    if (!textContent || textContent.length < 15) {
      setErrorMsg("Please write at least a full sentence or paragraph before saving.");
      return;
    }

    const firstSentences = textContent.slice(0, 100) + "...";
    generateAndSaveBook(textTitle, "Author Draft", textContent, firstSentences);
    
    setTextTitle("");
    setTextContent("");
    setAiPrompt("");
    triggerSuccess("Draft narrative saved to library bookshelf!");
  };

  // ACTION: AI assist writer script generation
  const handleAiWriterGenerate = async () => {
    if (!aiPrompt) {
      setErrorMsg("Please write a writing prompt for the AI Assistant first.");
      return;
    }

    try {
      setErrorMsg(null);
      setIsAiGenerating(true);

      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic: aiPrompt, 
          style: "engaging narration style, highly descriptive language" 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed server script generation request.");
      }

      const data = await response.json();
      const rawText = data.text || "";

      // Try to intelligently parse Title and Content paragraphs
      let parsedTitle = "AI Generated Narrative";
      let parsedContent = rawText;

      const titleMatch = rawText.match(/# Title:\s*([^\n]+)/i) || rawText.match(/#\s*([^\n]+)/);
      if (titleMatch) {
        parsedTitle = titleMatch[1].trim();
        parsedContent = rawText.replace(titleMatch[0], "").trim();
      }

      setTextTitle(parsedTitle);
      setTextContent(parsedContent);
      setIsAiGenerating(false);
      triggerSuccess("Beautiful AI script written for you. Edit it below or click save!");
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Synthesizer failed creating draft.";
      setErrorMsg(errorMessage);
      setIsAiGenerating(false);
    }
  };

  // ACTION: Handle physical .txt file loader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text || text.length < 10) {
        setErrorMsg("The document is empty or unreadable.");
        setIsLoading(false);
        return;
      }

      const title = file.name.replace(/\.[^/.]+$/, ""); // strip extension
      const preview = text.substring(0, 120) + "...";

      generateAndSaveBook(title, "Local File Import", text, preview);
      setIsLoading(false);
      triggerSuccess(`Successfully parsed and saved ${file.name}!`);
    };

    reader.onerror = () => {
      setErrorMsg("Failed reading standard disk file.");
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  // ACTION: Process Image base64 for vision scanner OCR
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const mime = file.type;
    setScanMimeType(mime);

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(",")[1];
      setScanImageBase64(base64Data);
    };
    reader.onerror = () => {
      setErrorMsg("Failed reading snapshot layout buffer.");
    };
    reader.readAsDataURL(file);
  };

  const handleScanExecute = async () => {
    if (!scanImageBase64) {
      setErrorMsg("Please capture or select an image file first.");
      return;
    }

    try {
      setErrorMsg(null);
      setIsLoading(true);

      const response = await fetch("/api/scan-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          image: scanImageBase64, 
          mimeType: scanMimeType 
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.error || "Error during scan ocr parse.");
      }

      const data = await response.json();
      const transcription = data.text || "";

      if (!transcription || transcription.length < 5) {
        throw new Error("No clear language extracted. Ensure text is bright and in frame.");
      }

      // Convert transcription to a Book Draft
      const firstWords = transcription.slice(0, 80) + "...";
      generateAndSaveBook(`Captured Page OCR`, "AI Eyecare Vision", transcription, firstWords);

      // Reset
      setScanImageBase64(null);
      setIsLoading(false);
      triggerSuccess("Vision OCR successfully parsed your document page and saved it!");
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Vision scanner processing faulted.";
      setErrorMsg(errorMessage);
      setIsLoading(false);
    }
  };

  // ACTION: Scrape Web address link
  const handleScrapeExecute = async () => {
    if (!scrapeUrl) {
      setErrorMsg("Please insert a valid HTTP webpage address.");
      return;
    }

    try {
      setErrorMsg(null);
      setIsLoading(true);

      const response = await fetch("/api/import-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || "Fail querying the web reader endpoint.");
      }

      const article = await response.json();
      
      if (!article.content) {
        throw new Error("Failed to extract readable article content from the web link.");
      }

      generateAndSaveBook(
        article.title || "Web Imported Article", 
        article.author || "Web Publisher", 
        article.content, 
        article.summary || "Webpage link narrative stream."
      );

      setScrapeUrl("");
      setIsLoading(false);
      triggerSuccess(`Successfully scraped and parsed article structure!`);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Scraper engine encountered a socket error.";
      setErrorMsg(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div id="import-content-form" className="bg-zinc-900 border border-zinc-800/80 rounded-3xl p-6 shadow-xl max-w-2xl mx-auto space-y-6">
      
      {/* Upper Tab Switcher */}
      <div className="flex flex-wrap border-b border-zinc-800 pb-2 gap-4">
        <button
          onClick={() => { setActiveTab("write"); setErrorMsg(null); }}
          className={`pb-3.5 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "write" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <FileText className="w-4 h-4" />
          Write & AI Draft
        </button>
        <button
          onClick={() => { setActiveTab("file"); setErrorMsg(null); }}
          className={`pb-3.5 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "file" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          Local Files (.txt)
        </button>
        <button
          onClick={() => { setActiveTab("scan"); setErrorMsg(null); }}
          className={`pb-3.5 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "scan" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Camera className="w-4 h-4" />
          Scan Page Image (AI OCR)
        </button>
        <button
          onClick={() => { setActiveTab("link"); setErrorMsg(null); }}
          className={`pb-3.5 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "link" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Link2 className="w-4 h-4" />
          Paste Web Link
        </button>
      </div>

      {/* Warning/Alert notification logs */}
      {errorMsg && (
        <div className="bg-rose-950/30 border border-rose-900/60 p-3.5 rounded-2xl flex items-center gap-2.5 text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/30 border border-emerald-900/60 p-3.5 rounded-2xl flex items-center gap-2.5 text-emerald-200 text-xs animate-pulse-subtle">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* CONTENT TAB: 1. WRITE & AI WRITE */}
      {activeTab === "write" && (
        <div className="space-y-4 animate-fade-in relative">
          
          {/* AI Script draft help box */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="font-semibold text-xs text-zinc-200 block">Aura AI Writing Assistant</span>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Write a custom script prompt (e.g. 'Compose a brief motivational speech about consistency')"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
              />
              <button
                disabled={isAiGenerating}
                onClick={handleAiWriterGenerate}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-45 text-white px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 shrink-0"
              >
                {isAiGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5 font-medium">title text</label>
              <input
                type="text"
                placeholder="Give your script a header name"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 block mb-1.5 font-medium">narration script text content</label>
              <textarea
                placeholder="Type or paste your custom book page or article content. Aura TTS engine works best reading clean sentences separated into nice paragraphs..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={6}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 leading-relaxed font-sans"
              />
            </div>
          </div>

          <button
            onClick={handleSaveWritten}
            disabled={!textContent || !textTitle || isLoading}
            className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Save Draft to Shelf
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CONTENT TAB: 2. LOCAL UPLOAD */}
      {activeTab === "file" && (
        <div className="space-y-4 animate-fade-in">
          <div className="relative border-2 border-dashed border-zinc-700/80 rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-4 hover:border-indigo-500/55 transition-colors bg-zinc-950/20">
            <input 
              type="file" 
              accept=".txt" 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 text-indigo-400">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <span className="font-semibold text-sm text-zinc-200 block">Select Text File (.txt)</span>
              <span className="text-xs text-zinc-500 block mt-1">Select standard utf-8 encoded text files.</span>
            </div>
          </div>
          
          <div className="bg-zinc-950/40 p-3.5 border border-zinc-800/80 rounded-2xl text-xs text-zinc-400">
            <span className="font-semibold block text-zinc-300 mb-1">File Support Details:</span>
            We process standard local text layout dumps entirely on your local machine to preserve absolute confidentiality. No content is uploaded to any remote server indexes.
          </div>
        </div>
      )}

      {/* CONTENT TAB: 3. SCAN OCR */}
      {activeTab === "scan" && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-400">
            <span className="font-semibold block text-zinc-200 mb-0.5">Gemini Vision OCR Page Scanner</span>
            Take a snap of a physical book page with your smartphone or capture of a doc layout and Aura will clean, reformat, correct typos, and prepare standard chapters!
          </div>

          {/* Selector view */}
          <div className="relative border-2 border-dashed border-zinc-700/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-3 hover:border-indigo-500/55 transition-colors bg-zinc-950/20">
            <input 
              type="file" 
              accept="image/*" 
              ref={scanInputRef}
              onChange={handleImageSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {scanImageBase64 ? (
              <img 
                src={`data:${scanMimeType};base64,${scanImageBase64}`} 
                alt="Snap preview" 
                className="max-h-[140px] rounded-lg border border-zinc-800 object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            ) : (
              <>
                <div className="p-3 bg-zinc-900 border border-zinc-800 text-indigo-400 rounded-full">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-zinc-200 block">Take Photo or Upload Image</span>
                  <span className="text-xs text-zinc-500">Supports JPG, PNG, WEBP</span>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            {scanImageBase64 && (
              <button
                onClick={() => setScanImageBase64(null)}
                className="flex-1 border border-zinc-800 text-zinc-400 bg-zinc-900/40 py-3 rounded-2xl text-xs font-semibold cursor-pointer hover:bg-zinc-800 transition-all"
              >
                Clear Photo
              </button>
            )}
            
            <button
              onClick={handleScanExecute}
              disabled={!scanImageBase64 || isLoading}
              className="flex-1 bg-indigo-600 disabled:opacity-35 hover:bg-indigo-500 text-white py-3 rounded-2xl text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing OCR Layout...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  Perform Smart Scanning
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* CONTENT TAB: 4. WEB PASTE LINK */}
      {activeTab === "link" && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-400 flex items-start gap-2.5">
            <Link2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-zinc-200 mb-0.5">AI Article Scraping</span>
              Paste any blog address or news article link. The scraper removes newsletter boxes, cookies, nav elements, and compiles paragraphs.
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs text-zinc-500 block font-medium">article url link</label>
            <input
              type="url"
              placeholder="https://journal.neilgaiman.com/..."
              value={scrapeUrl}
              onChange={(e) => setScrapeUrl(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>

          <button
            onClick={handleScrapeExecute}
            disabled={!scrapeUrl || isLoading}
            className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 py-3 rounded-2xl text-xs font-semibold cursor-pointer disabled:opacity-35 transition-all flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scraping & Synthesizing Text...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Scrape & Open Article
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
