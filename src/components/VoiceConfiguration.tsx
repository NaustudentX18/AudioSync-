import { useState, useEffect } from "react";
import { UserSettings, VoiceModel } from "../types";
import { VOICE_DEFAULTS } from "../data";
import { synthesizeElevenLabs, synthesizeOpenAI } from "../utils/speech";
import { Key, Volume2, ShieldAlert, Sparkles, Check, Play, Loader2, Music, CheckCircle } from "lucide-react";

interface VoiceConfigurationProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

export default function VoiceConfiguration({ settings, onUpdateSettings }: VoiceConfigurationProps) {
  const [activeTab, setActiveTab] = useState<"keys" | "voices">("voices");
  const [filterEngine, setFilterEngine] = useState<string>("all");
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [testPlayError, setTestPlayError] = useState<string | null>(null);
  const [testingAudio, setTestingAudio] = useState<HTMLAudioElement | null>(null);
  const [availableWebVoices, setAvailableWebVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load available native Web Speech voices in run-time
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadWebVoices = () => {
        setAvailableWebVoices(window.speechSynthesis.getVoices());
      };
      loadWebVoices();
      window.speechSynthesis.onvoiceschanged = loadWebVoices;
    }
  }, []);

  // Filter voices based on selected engine
  const filteredVoices = VOICE_DEFAULTS.filter(v => {
    if (filterEngine === "all") return true;
    return v.engine === filterEngine;
  });

  // Handle testing / previewing a voice
  const handleTestVoice = async (voice: VoiceModel) => {
    try {
      setTestPlayError(null);
      if (testingAudio) {
        testingAudio.pause();
        setTestingAudio(null);
      }

      setTestingModelId(voice.id);
      const testPhrase = `Hi! I am ${voice.name.split(" ")[0]}. Your Aura Reader speech credentials are ready and configured beautifully.`;

      if (voice.engine === "webspeech") {
        if (!window.speechSynthesis) {
          throw new Error("Speech synthesis not supported on this browser.");
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(testPhrase);
        const engineVoice = availableWebVoices.find(v => v.name.includes(voice.voiceIdValue) || v.lang.includes(voice.voiceIdValue));
        if (engineVoice) utterance.voice = engineVoice;
        utterance.rate = settings.playbackSpeed;
        
        utterance.onend = () => setTestingModelId(null);
        utterance.onerror = (e) => {
          setTestingModelId(null);
          setTestPlayError("Browser speaking interrupted or failed.");
        };
        window.speechSynthesis.speak(utterance);
      } else if (voice.engine === "openai") {
        if (!settings.openaiKey) {
          throw new Error("Please enter your OpenAI API key in the 'Keys' tab first.");
        }
        const audioUrl = await synthesizeOpenAI(testPhrase, voice.voiceIdValue, settings.openaiKey);
        const audio = new Audio(audioUrl);
        setTestingAudio(audio);
        audio.play();
        audio.onended = () => setTestingModelId(null);
      } else if (voice.engine === "elevenlabs") {
        if (!settings.elevenlabsKey) {
          throw new Error("Please configure your ElevenLabs API key in the 'Keys' tab first.");
        }
        const audioUrl = await synthesizeElevenLabs(testPhrase, voice.voiceIdValue, settings.elevenlabsKey);
        const audio = new Audio(audioUrl);
        setTestingAudio(audio);
        audio.play();
        audio.onended = () => setTestingModelId(null);
      }
    } catch (err: any) {
      console.error(err);
      setTestPlayError(err.message || "Failed voice playback test.");
      setTestingModelId(null);
    }
  };

  return (
    <div id="voice-configuration" className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl max-w-4xl mx-auto">
      {/* Visual Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
          <Volume2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-zinc-100">Speech & Voice Studio</h2>
          <p className="text-zs text-zinc-400">Manage API keys, select vocal characters, and play tests.</p>
        </div>
      </div>

      {/* Internal Menu Tab Row */}
      <div className="flex border-b border-zinc-800 mb-6 gap-6">
        <button
          onClick={() => setActiveTab("voices")}
          className={`pb-3 font-medium text-sm transition-all flex items-center gap-2 ${
            activeTab === "voices" 
              ? "text-indigo-400 border-b-2 border-indigo-500" 
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Voices & Talents
        </button>
        <button
          onClick={() => setActiveTab("keys")}
          className={`pb-3 font-medium text-sm transition-all flex items-center gap-2 ${
            activeTab === "keys" 
              ? "text-indigo-400 border-b-2 border-indigo-500" 
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Key className="w-4 h-4" />
          API Credentials (BYO Keys)
        </button>
      </div>

      {/* Test speech errors */}
      {testPlayError && (
        <div className="flex items-start gap-2 bg-rose-950/40 border border-rose-900/50 p-3.5 rounded-2xl text-rose-200 text-xs mb-4">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div className="flex-1">
            <span className="font-semibold block">Speech Synthesis Failure</span>
            <span className="opacity-90">{testPlayError}</span>
          </div>
        </div>
      )}

      {/* TAB: KEYS SECTION */}
      {activeTab === "keys" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-zinc-950/40 border border-zinc-800 p-4 rounded-2xl flex gap-3 text-xs text-zinc-400">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200 block mb-0.5">Secure Clientside Storage</span>
              All API secret tokens are persisted inside your browser&apos;s isolated LocalStorage and dispatched directly to OpenAI or ElevenLabs endpoints. They never cross our or any third party server.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OpenAI Configure Block */}
            <div className="p-5 rounded-2xl bg-zinc-950/20 border border-zinc-800/80 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block shadow-sm" />
                <span className="font-semibold text-sm text-zinc-100">OpenAI Audio TTS Keys</span>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1.5 font-medium">openai api key</label>
                <input
                   type="password"
                  placeholder="sk-proj-..."
                  value={settings.openaiKey}
                  onChange={(e) => onUpdateSettings({ openaiKey: e.target.value })}
                  className="w-full text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Enables ultra-fast, cinematic speech nodes like Shimmer, Onyx, Shimmer-HD, and Alloy. Get your keys at platform.openai.com.
              </p>
            </div>

            {/* ElevenLabs Configure Block */}
            <div className="p-5 rounded-2xl bg-zinc-950/20 border border-zinc-800/80 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block shadow-sm" />
                <span className="font-semibold text-sm text-zinc-100">ElevenLabs Speech API Keys</span>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1.5 font-medium">elevenlabs x-api-key</label>
                <input
                   type="password"
                  placeholder="Insert ElevenLabs Secret"
                  value={settings.elevenlabsKey}
                  onChange={(e) => onUpdateSettings({ elevenlabsKey: e.target.value })}
                  className="w-full text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Unlock the apex industry speech model (natural breathing, micro-expressions). Check your profile settings at elevenlabs.io.
              </p>
            </div>
          </div>

          {/* Engine Selector Dropdown */}
          <div className="p-5 rounded-2xl bg-zinc-950/30 border border-indigo-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-sm text-zinc-200 block">Default Synthesizer Engine</span>
              <span className="text-xs text-zinc-500">Determine which speech engine executes when generating book pages by default.</span>
            </div>
            <div className="flex gap-2">
              {(["webspeech", "openai", "elevenlabs"] as const).map(eng => {
                const label = eng === "webspeech" ? "Web Speech (Free)" : eng === "openai" ? "OpenAI TTS" : "ElevenLabs";
                const isSelected = settings.preferredEngine === eng;
                return (
                  <button
                    key={eng}
                    onClick={() => {
                      // Automatically match default voice when switching engines
                      let defaultVoiceId = settings.selectedVoiceId;
                      if (eng === "webspeech") defaultVoiceId = "ws-en-us-neural";
                      if (eng === "openai") defaultVoiceId = "oa-nova";
                      if (eng === "elevenlabs") defaultVoiceId = "el-rachel";

                      onUpdateSettings({ 
                        preferredEngine: eng,
                        selectedVoiceId: defaultVoiceId
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
                      isSelected 
                        ? "bg-indigo-600 text-white" 
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: VOICES & TALENTS DIRECTORY */}
      {activeTab === "voices" && (
        <div className="space-y-6 animate-fade-in">
          {/* Sub-Header Horizontal Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-zinc-400 font-medium">Curated high-fidelity vocal actors:</span>
            <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-full border border-zinc-800">
              {["all", "webspeech", "openai", "elevenlabs"].map((engineOption) => (
                <button
                  key={engineOption}
                  onClick={() => setFilterEngine(engineOption)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all capitalize cursor-pointer ${
                    filterEngine === engineOption
                      ? "bg-zinc-800 text-indigo-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {engineOption === "all" ? "All Drivers" : engineOption === "webspeech" ? "Native Speech" : engineOption}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Listing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredVoices.map((voice) => {
              const isSelected = settings.selectedVoiceId === voice.id;
              const isPlayingPreview = testingModelId === voice.id;
              
              // Key missing check flags
              const isKeyNeeded = voice.engine !== "webspeech";
              const isKeyMissing = isKeyNeeded && (
                (voice.engine === "openai" && !settings.openaiKey) ||
                (voice.engine === "elevenlabs" && !settings.elevenlabsKey)
              );

              return (
                <div 
                  key={voice.id}
                  onClick={() => {
                    onUpdateSettings({ 
                      selectedVoiceId: voice.id,
                      preferredEngine: voice.engine
                    });
                  }}
                  className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected 
                      ? "bg-gradient-to-br from-zinc-900 to-indigo-950/20 border-indigo-500/40 shadow-md shadow-indigo-500/5" 
                      : "bg-zinc-950/30 border-zinc-800 hover:bg-zinc-900/40 hover:border-zinc-700"
                  }`}
                >
                  <div className="space-y-2">
                    {/* Badge and Title */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          voice.engine === "elevenlabs" ? "bg-indigo-500" : voice.engine === "openai" ? "bg-teal-500" : "bg-emerald-500"
                        }`} />
                        <span className="font-semibold text-sm text-zinc-100 group-hover:text-indigo-300 transition-colors">
                          {voice.name}
                        </span>
                      </div>
                      
                      {/* Engine Tag */}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider ${
                        voice.engine === "elevenlabs" 
                          ? "bg-indigo-950 text-indigo-300" 
                          : voice.engine === "openai" 
                          ? "bg-teal-950 text-teal-300" 
                          : "bg-emerald-950/80 text-emerald-300"
                      }`}>
                        {voice.engine === "webspeech" ? "Free" : voice.engine}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-normal line-clamp-2">
                      {voice.description}
                    </p>
                  </div>

                  {/* Foot Controls */}
                  <div className="mt-4 pt-3 border-t border-zinc-900/50 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-zinc-500">
                      Gender: {voice.gender}
                    </span>

                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      {/* Preview Button */}
                      <button
                        onClick={() => handleTestVoice(voice)}
                        disabled={isKeyMissing}
                        className={`p-1.5 rounded-full transition-all cursor-pointer ${
                          isKeyMissing 
                            ? "text-zinc-600 bg-zinc-950 cursor-not-allowed" 
                            : isPlayingPreview 
                            ? "bg-indigo-600 text-white scale-105" 
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                        }`}
                        title={isKeyMissing ? "Credential Needed to play preview" : "Prehear Voice Anchor"}
                      >
                        {isPlayingPreview ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>

                      {/* Select Indicator */}
                      <button
                        onClick={() => {
                          onUpdateSettings({ 
                            selectedVoiceId: voice.id,
                            preferredEngine: voice.engine
                          });
                        }}
                        className={`p-1.5 rounded-full transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-indigo-600 text-white" 
                            : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Key Needed Warning Indicator overlay */}
                  {isKeyMissing && (
                    <div className="absolute top-1 right-2 inline-flex items-center gap-1 bg-rose-500/10 text-rose-450 border border-rose-500/20 px-1.5 py-0.5 rounded-md text-[9px] font-medium tracking-wide">
                      Key Missing
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
