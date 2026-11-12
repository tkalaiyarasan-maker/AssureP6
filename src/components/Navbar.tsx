import React from 'react';
import {
  UploadCloud,
  Download,
  FolderOpen,
  Sun,
  Moon,
  RotateCcw,
} from 'lucide-react';
import { SampleProjectInfo, SAMPLE_PROJECTS } from '../data/sampleXerData';

export type ActiveTab =
  | 'healthDashboard'
  | 'gantt'
  | 'tilos'
  | 'resourceGantt'
  | 'activities'
  | 'wbs'
  | 'dcma'
  | 'resources'
  | 'raw';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenUpload: () => void;
  onSelectSample?: (sample: SampleProjectInfo) => void;
  onDownloadXer: () => void;
  activeProjectCode: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onResetProject?: () => void;
  isProjectLoaded?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenUpload,
  onDownloadXer,
  activeProjectCode,
  theme = 'light',
  onToggleTheme,
  onResetProject,
  isProjectLoaded = false,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shrink-0 shadow-sm transition-colors">
      {/* Zone 1: Single-element brand wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap flex items-center gap-2 hover:text-amber-500 transition-colors"
        >
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 rotate-45 inline-block" />
          <span>Primavera P6 Health Check</span>
        </a>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
          / {activeProjectCode}
        </span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 overflow-x-auto py-0.5">
        <button
          onClick={() => onTabChange('healthDashboard')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
            activeTab === 'healthDashboard'
              ? 'bg-amber-400 text-slate-950 shadow-sm font-bold'
              : 'hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-amber-700 dark:text-amber-300'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Health Dashboard
        </button>
        <button
          onClick={() => onTabChange('gantt')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'gantt'
              ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          Gantt Timeline
        </button>
        <button
          onClick={() => onTabChange('tilos')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'tilos'
              ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          TILOS (Time-Chainage)
        </button>
        <button
          onClick={() => onTabChange('resourceGantt')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'resourceGantt'
              ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          Resource Assignments
        </button>
        <button
          onClick={() => onTabChange('activities')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'activities'
              ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          Activity Sheet
        </button>
        <button
          onClick={() => onTabChange('wbs')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'wbs'
              ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          WBS Tree
        </button>
        <button
          onClick={() => onTabChange('dcma')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'dcma'
              ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          DCMA 14 Audit
        </button>
        <button
          onClick={() => onTabChange('resources')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'resources'
              ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          Resources
        </button>
        <button
          onClick={() => onTabChange('raw')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'raw'
              ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          Raw Tables (%T)
        </button>
      </nav>

      {/* Zone 3: Primary Action, Theme Toggle & Export */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Theme Toggle (Light / Dark) */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden xl:inline">Dark</span>
              </>
            )}
          </button>
        )}

        {/* Export / Download button */}
        <button
          onClick={onDownloadXer}
          title="Export and Download valid .XER file"
          className="p-1.5 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-transparent hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 rounded-lg transition-colors hidden lg:flex items-center gap-1 text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Export .XER</span>
        </button>

        {/* Reset / Close loaded project button */}
        {isProjectLoaded && onResetProject && (
          <button
            onClick={onResetProject}
            title="Close current project and reset to empty state"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-300 dark:border-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            <span className="hidden xl:inline">Reset</span>
          </button>
        )}

        {/* Primary CTA */}
        <button
          onClick={onOpenUpload}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          Open .XER File
        </button>
      </div>
    </header>
  );
};
