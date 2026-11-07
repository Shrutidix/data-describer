import React from 'react';
import {
  LayoutDashboard,
  Columns,
  ShieldCheck,
  GitFork,
  BarChart3,
  MessageSquare,
  Sparkles,
  GitCompare,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
  Lock,
} from 'lucide-react';
import { useDatasetStore } from '../../store/useDataset';
import { Page } from '../../types';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresDataset?: boolean;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'columns', label: 'Columns', icon: Columns },
  { id: 'quality', label: 'Quality', icon: ShieldCheck },
  { id: 'relationships', label: 'Relationships', icon: GitFork },
  { id: 'visualize', label: 'Visualize', icon: BarChart3 },
  { id: 'chat', label: 'Chat AI', icon: MessageSquare },
  { id: 'clean', label: 'Clean', icon: Sparkles },
  { id: 'compare', label: 'Compare', icon: GitCompare },
  { id: 'report', label: 'Report', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage, isSidebarCollapsed, toggleSidebar, currentDataset } =
    useDatasetStore();

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 transition-all duration-300 flex flex-col justify-between border-r ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } bg-[#0D1322] border-slate-800 text-slate-300`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <button
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-3 overflow-hidden text-left focus:outline-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Database className="w-5 h-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="leading-tight">
                <span className="font-bold text-white text-base tracking-tight block">
                  Data Describer
                </span>
                <span className="text-[10px] uppercase font-semibold text-indigo-400 tracking-wider">
                  Privacy First
                </span>
              </div>
            )}
          </button>

          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const isDisabled = item.requiresDataset && !currentDataset;

            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && setCurrentPage(item.id)}
                disabled={isDisabled}
                title={isSidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : isDisabled
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : ''}`} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Privacy Badge */}
      <div className="p-3 border-t border-slate-800/80">
        <div
          className={`flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 ${
            isSidebarCollapsed ? 'justify-center' : ''
          }`}
        >
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          {!isSidebarCollapsed && (
            <div className="text-[11px] leading-tight">
              <span className="font-semibold text-slate-200 block">100% Offline</span>
              <span className="text-slate-500">Data never leaves PC</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

