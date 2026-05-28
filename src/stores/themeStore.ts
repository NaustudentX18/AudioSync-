import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  theme: {
    background: string;
    surface: string;
    accent: string;
    text: string;
  };
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: true,
  theme: {
    background: '#0a0a0f',
    surface: '#111118',
    accent: '#f0a000',
    text: '#ffffff',
  },
  toggleTheme: () => set((state) => ({
    isDark: !state.isDark,
    theme: !state.isDark 
      ? { background: '#0a0a0f', surface: '#111118', accent: '#f0a000', text: '#ffffff' }
      : { background: '#f8f8f8', surface: '#ffffff', accent: '#d97706', text: '#111111' }
  })),
}));
