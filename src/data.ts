import { BookItem, VoiceModel } from "./types";

// Dynamic default audiobooks/books
export const DEFAULT_BOOKS: BookItem[] = [
  {
    id: "sherlock-holmes",
    title: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    summary: "A thrilling intellectual puzzle of memory and logic. Meet the mastermind detective as he cracks the Scandal in Bohemia.",
    content: "To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind. He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position.",
    coverGradient: "from-amber-600 via-yellow-600 to-amber-900",
    dateAdded: "2026-05-18",
    durationSeconds: 98,
    progressSeconds: 0,
    isDefault: true
  },
  {
    id: "time-machine",
    title: "The Time Machine",
    author: "H. G. Wells",
    summary: "A science fiction pioneer journey across time. Discover the splitting of humanity into the gentle Eloi and the subterranean Morlocks.",
    content: "The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. His grey eyes shone and twinkled, and his usually pale face was flushed and animated. The fire burned brightly, and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses. Our chairs, being his patents, embraced and caressed us rather than submitted to be sat upon, and there was that luxurious after-dinner atmosphere when thought runs gracefully free of the trammels of precision.",
    coverGradient: "from-emerald-600 via-teal-700 to-emerald-950",
    dateAdded: "2026-05-20",
    durationSeconds: 115,
    progressSeconds: 0,
    isDefault: true
  },
  {
    id: "metamorphosis",
    title: "The Metamorphosis",
    author: "Franz Kafka",
    summary: "One morning, as Gregor Samsa awoke from uneasy dreams, he found himself transformed in his bed into a gigantic insect.",
    content: "One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved helplessly before his eyes. 'What's happened to me?' he thought.",
    coverGradient: "from-rose-600 via-pink-600 to-rose-950",
    dateAdded: "2026-05-21",
    durationSeconds: 104,
    progressSeconds: 0,
    isDefault: true
  },
  {
    id: "prophet",
    title: "The Prophet",
    author: "Kahlil Gibran",
    summary: "A world-famous spiritual masterpiece. Rich advice on love, marriage, eating, work, joy, sorrow, and freedom.",
    content: "Almustafa, the chosen and the beloved, who was a dawn unto his own day, had waited twelve years in the city of Orphalese for his ship that was to return and bear him back to the isle of his birth. And in the twelfth year, on the twenty-fifth of Elul, the month of reaping, he climbed the hill without the city walls and looked seaward; and he beheld his ship coming with the mist. Then the gates of his heart were flung open, and his joy flew far over the sea. And he closed his eyes and prayed in the silences of his soul.",
    coverGradient: "from-indigo-600 via-violet-700 to-indigo-950",
    dateAdded: "2026-05-22",
    durationSeconds: 110,
    progressSeconds: 0,
    isDefault: true
  }
];

// Curated list of high-quality default voices for each engine
export const VOICE_DEFAULTS: VoiceModel[] = [
  // Web Speech API fallback voices
  {
    id: "ws-en-us-neural",
    name: "System English Neural (Built-in)",
    engine: "webspeech",
    gender: "female",
    description: "Highly responsive standard system synthetic voice. Zero latency.",
    voiceIdValue: "Google US English"
  },
  {
    id: "ws-en-gb-neural",
    name: "System British Male (Built-in)",
    engine: "webspeech",
    gender: "male",
    description: "Elegant British Accent system native synthesizer.",
    voiceIdValue: "Google UK English Male"
  },
  {
    id: "ws-native-default",
    name: "Standard Native Default",
    engine: "webspeech",
    gender: "neutral",
    description: "System standard, adapts dynamically to active browser setup.",
    voiceIdValue: "default"
  },
  
  // Kokoro offline voices
  {
    id: "ko-af-heart",
    name: "Heart (Kokoro)",
    engine: "kokoro",
    gender: "female",
    description: "High quality American female voice.",
    voiceIdValue: "af_heart"
  },
  {
    id: "ko-am-fenrir",
    name: "Fenrir (Kokoro)",
    engine: "kokoro",
    gender: "male",
    description: "High quality American male voice.",
    voiceIdValue: "am_fenrir"
  },
  {
    id: "ko-bf-emma",
    name: "Emma (Kokoro)",
    engine: "kokoro",
    gender: "female",
    description: "High quality British female voice.",
    voiceIdValue: "bf_emma"
  },

  // ElevenLabs premium voices
  {
    id: "el-rachel",
    name: "Rachel (ElevenLabs)",
    engine: "elevenlabs",
    gender: "female",
    description: "Warm, professional, persuasive voice perfect for narration and conversational articles.",
    voiceIdValue: "21m00Tcm4TlvDq8ikWAM"
  },
  {
    id: "el-drew",
    name: "Drew (ElevenLabs)",
    engine: "elevenlabs",
    gender: "male",
    description: "Deep, authoritative news reporter style voice. Excellent for non-fiction.",
    voiceIdValue: "29vD33N1CtxCmqQRPOHJ"
  },
  {
    id: "el-clyde",
    name: "Clyde (ElevenLabs)",
    engine: "elevenlabs",
    gender: "male",
    description: "A charismatic, warm, deep story reading voice with subtle texture.",
    voiceIdValue: "2EiwX775HQb3i1N7vI6h"
  },
  {
    id: "el-nicole",
    name: "Nicole (ElevenLabs)",
    engine: "elevenlabs",
    gender: "female",
    description: "Crisp, energetic, and highly articulated, ideal for lectures and training material.",
    voiceIdValue: "piTKgcLEGmPEe24STN3y"
  },
  {
    id: "el-adam",
    name: "Adam (ElevenLabs)",
    engine: "elevenlabs",
    gender: "male",
    description: "Deep, casual, and highly expressive narrative audio voice. One of ElevenLabs' flagship models.",
    voiceIdValue: "pNInz6obpgDQGcFmaJgB"
  },

  // OpenAI speech synthesis voices
  {
    id: "oa-alloy",
    name: "Alloy (OpenAI)",
    engine: "openai",
    gender: "neutral",
    description: "A balanced, versatile neutral voice designed for utility and general reading logs.",
    voiceIdValue: "alloy"
  },
  {
    id: "oa-echo",
    name: "Echo (OpenAI)",
    engine: "openai",
    gender: "male",
    description: "Warm, authoritative, athletic vocal signature. Great for dynamic audiobooks.",
    voiceIdValue: "echo"
  },
  {
    id: "oa-fable",
    name: "Fable (OpenAI)",
    engine: "openai",
    gender: "neutral",
    description: "Distinctive, high-contour, creative and theatrical narrative tone.",
    voiceIdValue: "fable"
  },
  {
    id: "oa-onyx",
    name: "Onyx (OpenAI)",
    engine: "openai",
    gender: "male",
    description: "Deep, rich, low-bass vocal signature. Strong, elegant presence.",
    voiceIdValue: "onyx"
  },
  {
    id: "oa-nova",
    name: "Nova (OpenAI)",
    engine: "openai",
    gender: "female",
    description: "Bright, energetic, approachable, and highly contemporary tone.",
    voiceIdValue: "nova"
  },
  {
    id: "oa-shimmer",
    name: "Shimmer (OpenAI)",
    engine: "openai",
    gender: "female",
    description: "Professional, clean, highly-focused voice, optimized for reading books and news.",
    voiceIdValue: "shimmer"
  }
];
