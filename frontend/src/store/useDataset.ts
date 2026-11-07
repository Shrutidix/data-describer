import { create } from 'zustand';
import { Page, DatasetMeta } from '../types';
import { api } from '../api/client';

interface AppState {
  currentPage: Page;
  currentDataset: DatasetMeta | null;
  recentDatasets: DatasetMeta[];
  theme: 'dark' | 'light';
  isSidebarCollapsed: boolean;
  ollamaConnected: boolean;
  ollamaModels: string[];
  qualityScore: number | null;
  dataVersion: number;
  setCurrentPage: (page: Page) => void;
  setCurrentDataset: (dataset: DatasetMeta | null) => void;
  setRecentDatasets: (datasets: DatasetMeta[]) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setOllamaStatus: (connected: boolean, models: string[]) => void;
  setQualityScore: (score: number | null) => void;
  incrementVersion: () => void;
  loadRecentDatasets: () => Promise<void>;
}

export const useDatasetStore = create<AppState>((set, get) => ({
  currentPage: 'home',
  currentDataset: null,
  recentDatasets: [],
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
  isSidebarCollapsed: false,
  ollamaConnected: false,
  ollamaModels: [],
  qualityScore: null,
  dataVersion: 0,

  setCurrentPage: (page) => set({ currentPage: page }),
  setCurrentDataset: (dataset) => {
    set({ currentDataset: dataset, qualityScore: null });
    if (dataset) {
      // Add or update recent datasets
      const existing = get().recentDatasets.filter((d) => d.dataset_id !== dataset.dataset_id);
      set({ recentDatasets: [dataset, ...existing].slice(0, 5) });
    }
  },
  setRecentDatasets: (datasets) => set({ recentDatasets: datasets }),
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: newTheme };
    }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setOllamaStatus: (connected, models) =>
    set({ ollamaConnected: connected, ollamaModels: models }),
  setQualityScore: (score) => set({ qualityScore: score }),
  incrementVersion: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
  loadRecentDatasets: async () => {
    try {
      const list = await api.getDatasets();
      if (list && list.length > 0) {
        set({ recentDatasets: list });
        if (!get().currentDataset) {
          set({ currentDataset: list[0] });
        }
      }
    } catch {
      // Silent error handling for initial load
    }
  },
}));
