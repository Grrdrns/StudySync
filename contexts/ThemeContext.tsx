import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type AppTheme = 'dark' | 'light';

export interface ThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textSecondary: string;
  muted: string;
  primary: string;
  tabBar: string;
  tabBorder: string;
}

export const DARK_COLORS: ThemeColors = {
  bg: '#0F172A',
  surface: '#1E293B',
  surface2: '#0F172A',
  border: '#334155',
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  muted: '#94A3B8',
  primary: '#6366F1',
  tabBar: '#1E293B',
  tabBorder: '#334155',
};

export const LIGHT_COLORS: ThemeColors = {
  bg: '#F1F5F9',
  surface: '#FFFFFF',
  surface2: '#F8FAFC',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#334155',
  muted: '#64748B',
  primary: '#6366F1',
  tabBar: '#FFFFFF',
  tabBorder: '#E2E8F0',
};

interface ThemeContextType {
  theme: AppTheme;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = '@studysync_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    });
  }, []);

  function toggleTheme() {
    const next: AppTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }

  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
