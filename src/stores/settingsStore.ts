import { create } from 'zustand';
import { UserSettings } from '../types';
import { setEncryptedItem, getEncryptedItem } from '../lib/secureStorage';

const SECRET = 'audiosync-settings-secret';

interface SettingsState extends UserSettings {
  // Actions
  updateSettings: (patch: Partial<UserSettings>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: UserSettings = {
  elevenlabsKey: '',
  openaiKey: '',
  stepfunApiKey: '',
  preferredEngine: 'kokoro',
  selectedVoiceId: 'kokoro-af_heart',
  playbackSpeed: 1.0,
  stepfunModel: 'step-tts-2',
  ttsProvider: 'kokoro',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,

  updateSettings: (patch) => {
    set({ ...patch });
  },

  loadSettings: async () => {
    try {
      const saved = await getEncryptedItem('audiosync_settings', SECRET);
      if (saved) {
        const parsed = JSON.parse(saved) as UserSettings;
        set({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  saveSettings: async () => {
    try {
      const all = get();
      // Encrypt all settings together (API keys included — stored in IndexedDB)
      await setEncryptedItem('audiosync_settings', JSON.stringify(all), SECRET);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },
}));

// Convenience hook to auto-save on changes
export function useAutoSaveSettings() {
  const settings = useSettingsStore();
  // Auto-save on any change (debounced in real usage)
  // For simplicity, we'll call saveSettings manually from UI
  return settings;
}
