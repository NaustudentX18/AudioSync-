# Stream 2: AI Intelligence — Feature Research

**Project:** AudioSync — Local-first audiobook player
**Research Date:** 2026-05-25
**Status:** Research Complete — Ready for Implementation Planning

---

## Overview

This document covers research for **Stream 2: AI Intelligence** features as defined in `docs/research/research-plan.md`. Each section covers the state-of-the-art, implementation complexity, dependencies, code snippets, risk notes, and effort estimates.

---

## 1. Chapter Detection Accuracy

**Goal:** Automatically split raw book text into chapters with high accuracy.

### Approaches Compared

| Approach | Model | Pros | Cons | Best For |
|----------|-------|------|------|---------|
| **Sentence-Transformers (Local)** | `all-mpnet-base-v2`, `all-MiniLM-L6-v2` | 100% offline, fast, no API cost | Needs fine-tuning for book-length documents | Privacy-first users, offline mode |
| **Gemini (Cloud)** | `gemini-2.0-flash` | High accuracy, understands narrative structure, zero local compute | Requires API key, not offline | High-accuracy online mode |
| **Hybrid** | Sentence-transformers + rule-based post-filter | Offline-capable with improved accuracy | More complex pipeline | Best of both worlds |

### Key Findings

- **Sentence-transformers** generate semantic sentence embeddings and are fine-tuned for similarity tasks. `all-mpnet-base-v2` consistently outperforms `all-MiniLM-L6-v2` on embedding quality benchmarks (MDPI 2024).
- **Semantic segmentation**: Compute pairwise cosine similarity between adjacent sentences. A sharp drop in similarity score signals a chapter boundary.
- **Hybrid approach**: Use sentence-transformers to pre-filter candidate boundaries, then apply a rule-based layer (heuristics: look for "Chapter", "Part", standalone headings, or a gap of 3+ blank lines).
- **AudioSync current state**: Chapter detection is already implemented in `src/lib/gemini.ts` via `detectChapters()`, using only Gemini. No local fallback exists.

### Recommendation

Implement **hybrid chapter detection** as primary, with Gemini as fallback:

```typescript
// Pseudocode — hybrid chapter detection
import { pipeline } from '@xenova/transformers';

async function detectChaptersHybrid(text: string): Promise<string[]> {
  // Step 1: Sentence-transformers candidate detection
  const embeddingModel = await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2');
  const sentences = splitIntoSentences(text);
  const embeddings = await Promise.all(
    sentences.map(s => embeddingModel(s, { pooling: 'mean', normalize: true }))
  );
  
  // Step 2: Compute similarity drops
  const boundaries: number[] = [];
  for (let i = 1; i < embeddings.length; i++) {
    const sim = cosineSimilarity(embeddings[i - 1], embeddings[i]);
    if (sim < SIMILARITY_THRESHOLD) boundaries.push(i);
  }
  
  // Step 3: Rule-based refinement (headings, blank lines)
  const refined = applyHeadingRules(text, boundaries);
  
  return refined;
}
```

- **Implementation Complexity:** Medium
- **Dependencies:** `@xenova/transformers` (for browser), or `@huggingface/transformers` with ONNX Runtime
- **Effort Estimate:** 13 story points (3–4 days)

---

## 2. Summarization: Abstractive vs. Extractive

**Goal:** Generate chapter summaries at different reading levels (child, teen, adult).

### Approaches Compared

| Approach | Model/Tool | Quality | Speed | Cost | Offline |
|----------|-----------|---------|-------|------|---------|
| **Abstractive (Gemini)** | `gemini-2.0-flash` | Excellent — natural language | Fast | Paid (free tier) | ❌ |
| **Extractive (TextRank)** | Graph-based ranking | Good — factual, literal | Very fast | Free | ✅ |
| **Extractive (BERT)** | `BERTSUM` / `distilbert` | Good — context-aware | Fast | Free | ✅ |

### Key Findings

- **Abstractive summarization** rewrites content in new words, producing natural summaries. Gemini 2.0 Flash achieves state-of-the-art quality with prompt engineering (few-shot examples).
- **Extractive summarization** selects key sentences verbatim. TextRank is unsupervised and works offline; BERT-based extractive models (BERTSUM) add contextual scoring.
- **Reading level adaptation**: For child-level summaries, add explicit prompts: "Explain this like I'm 10 years old." For teen, use simpler vocabulary prompts. CEFR-aligned prompts are also effective.
- **Gemini advantage**: Achieves best scores on conciseness and readability vs BART (ACL 2023).
- **AudioSync current state**: Abstractive summarization via `summarizeText()` in `gemini.ts`. No extractive fallback or reading-level variants.

### Recommendation

Implement a **two-tier summarization system**:

```typescript
interface SummaryOptions {
  level: 'child' | 'teen' | 'adult';
  style: 'abstractive' | 'extractive';
}

async function summarize(text: string, opts: SummaryOptions): Promise<string> {
  const levelPrompt = {
    child: 'Summarize for a 10-year-old reader. Use simple words.',
    teen: 'Summarize for a high school student. Be clear and engaging.',
    adult: 'Summarize concisely for an adult reader. Keep key plot points.',
  }[opts.level];

  if (opts.style === 'abstractive') {
    return genAI.summarize(text, levelPrompt);
  }

  // Extractive fallback (TextRank via sumy or transformers)
  return extractiveSummarize(text, opts.level);
}
```

- **Implementation Complexity:** Low-Medium
- **Dependencies:** `sumy` (TextRank extractive), or `@xenova/transformers` for BERTSUM
- **Effort Estimate:** 8 story points (2 days)

---

## 3. Named Entity Recognition (NER)

**Goal:** Extract characters, locations, and settings from book text.

### Approaches Compared

| Approach | Model/Library | Character Extraction | Location Extraction | Offline |
|----------|---------------|--------------------|--------------------|---------|
| **SpaCy** | `en_core_web_lg` | ✅ Good | ✅ Good | ✅ |
| **HuggingFace NER** | `dslim/bert-base-NER` | ✅ Good | ✅ Good | ✅ |
| **Gemini** | LLM-based extraction | ✅ Excellent | ✅ Excellent | ❌ |
| **Flair** | Transformer-based | ✅ Very Good | ✅ Good | ✅ |

### Key Findings

- **SpaCy's `en_core_web_lg`** is the most practical choice for browser/Node.js: fast, lightweight, and includes entity types for PERSON, GPE (geopolitical entity), LOC, FAC, and ORG.
- **BERT-based NER** (e.g., `dslim/bert-base-NER`) achieves higher F1 scores but requires more compute. Works well via `@xenova/transformers` in the browser.
- **LLM-based NER** (Gemini prompt: "Extract all character names, locations, and settings") achieves the best literary entity extraction (handles fictional names, aliases) but is not offline.
- **Hybrid approach**: Run local NER first, then use Gemini to resolve ambiguous entities and group by relationship (e.g., family members, factions).
- **Entity persistence**: Store entities in IndexedDB keyed by book ID, with mention counts and chapter distribution for building character relationship graphs.

### Recommendation

Use **SpaCy for primary NER** with **Gemini for disambiguation**:

```typescript
// Pseudocode — NER pipeline
import { pipeline } from '@xenova/transformers';

interface BookEntities {
  characters: string[];
  locations: string[];
  settings: string[];
}

async function extractEntities(text: string): Promise<BookEntities> {
  // Local NER (browser-safe via transformers.js)
  const ner = await pipeline('token-classification', 'Xenova/dslim/bert-base-NER');
  const entities = await ner(text, { stride: 128, ...aggregationStrategy: 'simple' });

  // Classify by type
  const characters = entities
    .filter(e => e.entity === 'PER')
    .map(e => e.word);
  const locations = entities
    .filter(e => e.entity === 'LOC' || e.entity === 'GPE')
    .map(e => e.word);

  return { characters: dedupe(characters), locations: dedupe(locations), settings: [] };
}
```

- **Implementation Complexity:** Medium
- **Dependencies:** `@xenova/transformers`, or `spacy` via WASM (see `spacy-wasm`); Gemini for disambiguation
- **Effort Estimate:** 13 story points (3–4 days)

---

## 4. Vocabulary Difficulty Scoring

**Goal:** Score vocabulary difficulty using CEFR levels and/or Flesch-Kincaid.

### Approaches Compared

| Approach | Standard | Granularity | Complexity | Offline |
|----------|----------|-------------|------------|---------|
| **Flesch-Kincaid Grade Level** | US grade level | Coarse | Low | ✅ |
| **Flesch Reading Ease** | 1–100 score | Coarse | Low | ✅ |
| **CEFR Alignment** | A1–C2 | Fine | Medium | ⚠️ (needs word list) |
| **Dale-Chall Formula** | US grade + word list | Medium | Low-Medium | ✅ |
| **ML-based** | Custom classifier | Fine | High | ✅ |

### Key Findings

- **Flesch-Kincaid Grade Level (FKGL)** uses average sentence length and average syllables per word:
  ```
  FKGL = 0.39 × (words/sentences) + 11.8 × (syllables/words) − 15.59
  ```
  Score of ~8 = 8th grade reading level (ages 13–14).
- **Flesch Reading Ease** scores 1–100; 60–70 = standard/plain English (8th–9th grade).
- **CEFR mapping** (approximate):
  - FKGL 5–6 → A2 (elementary)
  - FKGL 7–8 → B1 (intermediate)
  - FKGL 10–12 → B2 (upper-intermediate)
  - FKGL 13+ → C1+ (advanced)
- **Syllable counting** is the hardest part to do accurately in JS. Use a dictionary-based approach (e.g., `syllable` npm package) or a simplified heuristic (count vowel groups).
- **Dale-Chall formula** uses a 3,000-word "familiar words" list, giving better results for adult text.
- **AudioSync current state**: No vocabulary scoring exists.

### Recommendation

Implement **Flesch-Kincaid + CEFR mapping** as a lightweight, offline-first solution:

```typescript
// Pseudocode — Flesch-Kincaid Grade Level
function fleschKincaidGradeLevel(text: string): number {
  const sentences = countSentences(text);
  const words = countWords(text);
  const syllables = countSyllables(text);

  if (sentences === 0 || words === 0) return 0;

  const avgSentenceLength = words / sentences;
  const avgSyllablesPerWord = syllables / words;

  return 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;
}

function cefrFromFKGL(fkgl: number): string {
  if (fkgl < 6) return 'A2';
  if (fkgl < 8) return 'B1';
  if (fkgl < 10) return 'B2';
  if (fkgl < 13) return 'C1';
  return 'C2';
}
```

- **Implementation Complexity:** Low
- **Dependencies:** A syllable-counting library (e.g., `syllable` npm package) or custom heuristic
- **Effort Estimate:** 5 story points (1 day)

---

## 5. Reading Comprehension Quiz Generation

**Goal:** Auto-generate reading comprehension quizzes from chapter text.

### Key Findings

- **LLM-based quiz generation** produces the highest quality questions. Best results come from few-shot prompting with examples of desired question types (multiple-choice, true/false, short answer).
- **Prompt engineering is critical**: Studies show that appropriate prompt engineering techniques ensure AI-generated questions are relevant and properly aligned to reading levels (MDPI 2024, Education Sciences).
- **Question types to support**:
  - Multiple-choice (4 options, 1 correct)
  - True/False with explanation
  - Short answer (graded via keyword matching or LLM)
  - Fill-in-the-blank
- **Reading-level alignment**: Use the vocabulary scoring from Feature 4 to adapt question complexity.
- **AudioSync current state**: No quiz generation.

### Recommendation

Implement **LLM-driven quiz generation** with few-shot prompt templates:

```typescript
// Pseudocode — quiz generation prompt
const quizPrompt = (text: string, level: string, count: number) => `
Generate ${count} reading comprehension questions from the following text at ${level} reading level.
Return as JSON array with fields: question, type, options[], answer, explanation.

Text:
${text.substring(0, 4000)}  // trim for token limits
`;

// Multiple-choice example output:
// {
//   "question": "What was the protagonist's main motivation?",
//   "type": "multiple_choice",
//   "options": ["Wealth", "Revenge", "Love", "Duty"],
//   "answer": "Love",
//   "explanation": "The text states she returned 'driven by a love she could not forget.'"
// }
```

- **Implementation Complexity:** Medium
- **Dependencies:** Gemini API; optionally `json-schema` for structured output validation
- **Effort Estimate:** 8 story points (2 days)

---

## 6. Quote Extraction + Chapter Lookup

**Goal:** Extract notable quotes from text and associate them with chapter locations.

### Key Findings

- **Semantic search** is the preferred modern approach for quote extraction. Embed the book text in fixed-size chunks (e.g., 512 tokens), store vectors in IndexedDB, and retrieve at query time.
- **Embedding models**: `all-mpnet-base-v2` or `nomic-embed-text` for best semantic quality. For web/browser, use `Xenova/all-mpnet-base-v2` via `@xenova/transformers`.
- **Chunking strategy**: Overlapping windows (e.g., 512-token chunks with 128-token overlap) to avoid splitting quotes mid-thought.
- **Chapter lookup**: Store chunk→chapter index alongside embeddings. On retrieval, filter results to the requested chapter.
- **QuOTE (Question-Oriented Text Embeddings)** (arXiv 2025) is a novel approach that optimizes embeddings specifically for QA-style retrieval — relevant for quote search.
- **AudioSync current state**: No quote extraction or semantic search exists.

### Recommendation

Implement **semantic quote search** with local embeddings:

```typescript
// Pseudocode — quote extraction pipeline
interface BookChunk {
  text: string;
  chapterIndex: number;
  embedding: number[];  // 768-dim from mpnet
}

async function indexBook(text: string, chapterBreaks: number[]): Promise<BookChunk[]> {
  const embedder = await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2');
  const chunks = chunkText(text, 512, 128);  // 512 tokens, 128 overlap

  const indexed = await Promise.all(
    chunks.map(async (chunk, i) => ({
      text: chunk.text,
      chapterIndex: findChapter(i, chapterBreaks),
      embedding: await embedder(chunk.text, { pooling: 'mean', normalize: true }),
    }))
  );

  await saveToIndexedDB(indexed);  // persist locally
  return indexed;
}

async function searchQuotes(query: string, chapter?: number): Promise<string[]> {
  const all = await loadFromIndexedDB();
  const qEmbedding = await embed(query);
  const results = all
    .filter(c => chapter === undefined || c.chapterIndex === chapter)
    .map(c => ({ chunk: c, score: cosineSimilarity(qEmbedding, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  return results.map(r => r.chunk.text);
}
```

- **Implementation Complexity:** High
- **Dependencies:** `@xenova/transformers`, IndexedDB wrapper (`idb` library)
- **Effort Estimate:** 21 story points (5–7 days)

---

## 7. Book Sentiment Analysis Over Time

**Goal:** Track emotional tone across a book and surface peaks/valleys.

### Key Findings

- **Sentiment analysis techniques**: Three categories — lexicon-based (VADER, AFINN), ML-based (SVM with TF-IDF), and deep learning (BERT fine-tuned for sentiment).
- **Narrative emotion arcs**: Sentiment trajectories map to narrative emotion arcs (joy, sadness, tension, relief). The EmotionArcs framework (ACL 2024) analyzed 9,000 literary texts and found identifiable patterns per genre.
- **Practical approach**: Use a sliding window (e.g., 500 words) and compute sentiment per window. Plot the resulting line graph to show the emotional journey.
- **Fine-grained vs coarse-grained**: Binary (positive/negative) is fast and useful for high-level arcs. Fine-grained (joy/anger/sadness/fear) requires models like `j-hartmann/emotion-english-distilroberta-base`.
- **AudioSync current state**: No sentiment analysis.

### Recommendation

Implement **sliding-window sentiment tracking** with VADER (fast, offline) + optional BERT emotion classifier:

```typescript
// Pseudocode — sentiment arc
import { pipeline } from '@xenova/transformers';

interface SentimentPoint {
  position: number;     // 0–1 across book
  sentiment: number;    // −1 (negative) to +1 (positive)
  windowText: string;
}

async function computeSentimentArc(text: string, windowSize = 500): Promise<SentimentPoint[]> {
  const sentiment = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
  const words = text.split(/\s+/);
  const points: SentimentPoint[] = [];

  for (let i = 0; i < words.length; i += windowSize / 2) {
    const window = words.slice(i, i + windowSize).join(' ');
    const result = await sentiment(window);
    const score = result[0].label === 'POSITIVE' ? result[0].score : -result[0].score;
    points.push({ position: i / words.length, sentiment: score, windowText: window });
  }

  return points;
}
```

- **Implementation Complexity:** Medium
- **Dependencies:** `@xenova/transformers` (distilbert SST-2), or `vader-sentiment` for lexicon approach
- **Effort Estimate:** 8 story points (2 days)

---

## 8. AI Q&A: RAG vs. Live Context Window

**Goal:** Enable users to ask questions about book content.

### Approaches Compared

| Approach | Mechanism | Pros | Cons | Best For |
|----------|-----------|------|------|---------|
| **RAG (Retrieval Augmented Generation)** | Retrieve relevant chunks → augment prompt | Precise citations, scalable to full library, cheaper | Retrieval overhead, can miss context | Long books, multi-book Q&A |
| **Live Context Window** | Entire book text in prompt | No retrieval step, full context | Expensive, context limits, slow | Short books, single-book Q&A |
| **Hybrid** | RAG + re-ranking + context window | Best accuracy | Most complex | Production-grade |

### Key Findings

- **Long-context LLMs** (e.g., Gemini 2M context) can ingest entire books but cost scales with context size. RAG is still more economical for repeated queries (deepset.ai 2024).
- **RAG beats long context** for most audiobook Q&A: a 100K-word book fits in Gemini's context, but each query re-reads the whole text, increasing latency and cost.
- **Best practice**: Chunk book into 512-token passages, embed with `all-mpnet-base-v2`, retrieve top-k (k=5), then generate answer from those chunks.
- **Citation tracking**: Include chunk index and chapter in the prompt so the LLM can reference exact locations.
- **AudioSync current state**: No Q&A feature exists. Gemini client only handles summarization and chapter detection.

### Recommendation

Implement **RAG-based Q&A** as primary, with optional full-context fallback for short books:

```typescript
// Pseudocode — RAG Q&A
async function answerQuestion(question: string, bookId: string): Promise<string> {
  // 1. Embed question
  const qEmbed = await embed(question);

  // 2. Retrieve top-5 relevant chunks
  const chunks = await retrieveTopK(bookId, qEmbed, 5);

  // 3. Build context-augmented prompt
  const context = chunks.map(c => `[Chapter ${c.chapterIndex}] ${c.text}`).join('\n\n');
  const prompt = `Answer the question using ONLY the context below. If the answer is not in the context, say "I don't know." Include chapter references.\n\nContext:\n${context}\n\nQuestion: ${question}\n\nAnswer:`;

  // 4. Generate answer
  const answer = await genAI.generateContent(prompt);
  return answer;
}
```

- **Implementation Complexity:** High
- **Dependencies:** `@xenova/transformers` (embeddings), IndexedDB (chunk store), Gemini (generation)
- **Effort Estimate:** 21 story points (5–7 days)

---

## 9. Prompt Engineering for Consistent Chapter Summaries

**Goal:** Ensure chapter summaries are consistent in tone, length, and style across all chapters of a book.

### Key Findings

- **Few-shot prompting** (2–5 examples) is the most effective technique for style consistency (Prompt Engineering Guide 2026).
- **Chain-of-Thought (CoT)** prompting ("Let's think step by step before writing the summary") improves summary quality by forcing structured reasoning.
- **System prompts** define tone, length, and format. A good system prompt for book summaries:
  ```
  You are a book summarizer. For each chapter, produce:
  1. A 2-sentence plot summary
  2. Key characters mentioned
  3. Emotional tone (1 word)
  Be consistent across all chapters of the same book.
  ```
- **Temperature**: Use `temperature=0.3` for more deterministic, consistent outputs.
- **Structured output**: Use JSON mode / function calling to enforce field structure: `{ summary: string, characters: string[], tone: string }`.
- **Cross-chapter consistency**: Pass a running "context summary" of previous chapters in the prompt so each summary is aware of prior events.
- **AudioSync current state**: `summarizeText()` uses a bare-bones prompt with no consistency enforcement, no structured output, and no context from prior chapters.

### Recommendation

Upgrade `summarizeText()` with a **structured, context-aware prompt template**:

```typescript
// Proposed — improved summary prompt
const SUMMARY_SYSTEM_PROMPT = `You are a literary summarizer for audiobook chapters.
Rules:
1. Write 2-3 sentences maximum.
2. Preserve the narrative tone of the original text.
3. List only characters who appear or are referenced in this chapter.
4. Rate emotional tone: hopeful | tense | somber | joyful | neutral | ominous.
5. Be consistent with previous chapters in the same book.

Previous chapter summaries for context:
${previousSummaries.map((s, i) => `Ch ${i + 1}: ${s}`).join('\n')}

Respond as JSON:
{ "summary": string, "characters": string[], "tone": string }
`;

// Usage
const response = await genAI.models.generateContent({
  model: "gemini-2.0-flash",
  contents: SUMMARY_SYSTEM_PROMPT + '\n\nChapter text:\n' + chapterText,
  config: { temperature: 0.3, responseMimeType: 'application/json' },
});
```

- **Implementation Complexity:** Low
- **Dependencies:** Gemini API (existing); structured output via `responseMimeType: 'application/json'`
- **Effort Estimate:** 3 story points (half day)

---

## Feature Priority Matrix

| Feature | Complexity | Effort | Impact | Priority |
|---------|-----------|--------|--------|----------|
| Chapter Detection (hybrid) | Medium | 3–4 days | High | P0 |
| Summarization (multi-level) | Low-Medium | 2 days | High | P0 |
| NER (characters/locations) | Medium | 3–4 days | High | P0 |
| Vocabulary Scoring | Low | 1 day | Medium | P1 |
| Quiz Generation | Medium | 2 days | Medium | P1 |
| Quote Extraction + Lookup | High | 5–7 days | High | P1 |
| Sentiment Analysis | Medium | 2 days | Medium | P1 |
| AI Q&A (RAG) | High | 5–7 days | High | P2 |
| Consistent Summaries | Low | 0.5 days | Medium | P0 |

### Critical Path

1. **Summarization + Chapter Detection + Consistent Summaries** — leverage existing Gemini integration, quick wins (P0).
2. **Vocabulary Scoring + Sentiment Analysis** — pure local computation, no API dependency (P0/P1).
3. **NER + Quiz Generation** — build on embedding infrastructure (P0/P1).
4. **Quote Extraction + RAG Q&A** — shared embedding index, most effort but highest reuse (P1/P2).

---

## Shared Infrastructure Recommendations

Several features share common building blocks. Investing in these first reduces total effort:

| Shared Component | Used By | Recommendation |
|-----------------|---------|----------------|
| **Sentence Embedding Index** | NER, Quote Search, RAG Q&A | Build once via `@xenova/transformers`, store in IndexedDB |
| **Text Chunker** | Summarization, Quiz Gen, Sentiment, Quote Search | Overlapping fixed-size window, configurable token count |
| **Book Processing Pipeline** | All features | Orchestrator: ingest → chunk → embed → process → store |
| **IndexedDB Schema** | All features | Unified `books`, `chunks`, `embeddings`, `entities`, `summaries` tables |

---

## Risk & Blocker Notes

- **Browser-based transformers**: `@xenova/transformers` (formerly `transformers.js`) works in-browser but model download is one-time (~50–200 MB per model). Consider preloading or bundling critical models in `public/models/`.
- **Token limits**: Gemini 2.0 Flash has a ~1M token context. For full-book processing, chunk text and process iteratively.
- **Offline requirement**: AudioSync is "local-first by default". Any cloud-dependent feature (Gemini) must have a local fallback or graceful degradation.
- **Performance on Pi**: The host is a Raspberry Pi. Local transformer inference will be slow; consider Web Workers to keep the UI responsive. Benchmark on-device before committing to local-only paths.
- **IndexedDB size**: Full-book embeddings for a 100K-word book (~150 MB raw text) produce ~300 chunks × 768 floats ≈ ~900 KB. IndexedDB easily handles this; no quota concerns for typical libraries.

---

*Document: docs/research/stream-2-ai.md | AudioSync Project*
