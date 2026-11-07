import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useDatasetStore } from '../../store/useDataset';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useDatasetStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors focus:outline-none"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-5 h-5 text-indigo-600 hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
};

