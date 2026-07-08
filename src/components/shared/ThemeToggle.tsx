'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const preferDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    setIsDark(preferDark);
    document.documentElement.classList.toggle('dark', preferDark);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  if (!mounted) {
    return (
      <button
        type="button"
        className="p-2 border border-border text-muted transition-all rounded-full flex items-center justify-center bg-cream/30 w-9 h-9"
        aria-label="Toggle Theme Placeholder"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 hover:bg-cream border border-border text-muted hover:text-saffron transition-all rounded-full flex items-center justify-center bg-cream/30 dark:hover:bg-surface-hover active:scale-95"
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-[18px] h-[18px] text-amber-500 animate-pulse" />
      ) : (
        <Moon className="w-[18px] h-[18px] text-zinc-600" />
      )}
    </button>
  );
};

export default ThemeToggle;
