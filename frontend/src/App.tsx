import React from 'react';
import { useDatasetStore } from './store/useDataset';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { Home } from './pages/Home';
import { Overview } from './pages/Overview';
import { Columns } from './pages/Columns';
import { Quality } from './pages/Quality';
import { Relationships } from './pages/Relationships';
import { Visualize } from './pages/Visualize';
import { Chat } from './pages/Chat';
import { Clean } from './pages/Clean';
import { Compare } from './pages/Compare';
import { Report } from './pages/Report';
import { Settings } from './pages/Settings';
import { MessageSquare } from 'lucide-react';

export const App: React.FC = () => {
  const { currentPage, setCurrentPage, isSidebarCollapsed } = useDatasetStore();

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'overview':
        return <Overview />;
      case 'columns':
        return <Columns />;
      case 'quality':
        return <Quality />;
      case 'relationships':
        return <Relationships />;
      case 'visualize':
        return <Visualize />;
      case 'chat':
        return <Chat />;
      case 'clean':
        return <Clean />;
      case 'compare':
        return <Compare />;
      case 'report':
        return <Report />;
      case 'settings':
        return <Settings />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main App Container */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Fixed Topbar */}
        <Topbar />

        {/* Page Content */}
        <main className="flex-1 mt-16 p-6 sm:p-8 overflow-y-auto">
          {renderPage()}
        </main>
      </div>

      {/* Floating AI Button (bottom-right) */}
      {currentPage !== 'chat' && (
        <button
          onClick={() => setCurrentPage('chat')}
          className="fixed bottom-6 right-6 p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 flex items-center gap-2 group transition-all duration-200 hover:scale-105 z-40"
          title="Ask AI about this dataset"
        >
          <MessageSquare className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="text-sm font-semibold hidden md:inline">Ask AI</span>
        </button>
      )}
    </div>
  );
};

export default App;

