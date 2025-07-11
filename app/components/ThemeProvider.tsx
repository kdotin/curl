'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: {
    primary: string;
    primaryHover: string;
    background: string;
    surface: string;
    surfaceHover: string;
    border: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const lightColors = {
  primary: '#6366f1', // Indigo-500
  primaryHover: '#4f46e5', // Indigo-600
  background: '#ffffff',
  surface: '#f8fafc', // Slate-50
  surfaceHover: '#f1f5f9', // Slate-100
  border: '#e2e8f0', // Slate-200
  text: '#0f172a', // Slate-900
  textSecondary: '#64748b', // Slate-500
  success: '#10b981', // Emerald-500
  warning: '#f97316', // Orange-500 (less harsh than yellow)
  error: '#ef4444', // Red-500
  info: '#3b82f6', // Blue-500
};

const darkColors = {
  primary: '#818cf8', // Indigo-400
  primaryHover: '#6366f1', // Indigo-500
  background: '#0f172a', // Slate-900
  surface: '#1e293b', // Slate-800
  surfaceHover: '#334155', // Slate-700
  border: '#475569', // Slate-600
  text: '#f8fafc', // Slate-50
  textSecondary: '#94a3b8', // Slate-400
  success: '#22c55e', // Green-500 (better contrast)
  warning: '#f97316', // Orange-500 (much better than bright yellow)
  error: '#ef4444', // Red-500 (better than the washed out red)
  info: '#3b82f6', // Blue-500 (better contrast)
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    // Apply theme to html element for global styles
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 