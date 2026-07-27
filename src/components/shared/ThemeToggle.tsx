'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';

const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export const ThemeToggle: React.FC = () => {
  const isMounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
  });

  useEffect(() => {
    if (!isMounted) return;
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme in localStorage:', e);
    }
  }, [isDark, isMounted]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  if (!isMounted) {
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
