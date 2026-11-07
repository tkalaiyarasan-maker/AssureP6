import React from 'react';
import {
  UploadCloud,
  Download,
  FolderOpen,
} from 'lucide-react';
import { SampleProjectInfo, SAMPLE_PROJECTS } from '../data/sampleXerData';

export type ActiveTab = 'healthDashboard' | 'gantt' | 'activities' | 'wbs' | 'dcma' | 'resources' | 'raw';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenUpload: () => void;
  onSelectSample: (sample: SampleProjectInfo) => void;
  onDownloadXer: () => void;
  activeProjectCode: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenUpload,
  onSelectSample,
  onDownloadXer,
  activeProjectCode,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
      {/* Zone 1: Single-element brand wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap flex items-center gap-2 hover:text-amber-400 transition-colors"
        >
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 rotate-45 inline-block" />
          <span>Primavera P6 Health Check</span>
        </a>
        <span className="text-xs text-slate-500 font-mono hidden sm:inline">
          / {activeProjectCode}
        </span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-slate-400 overflow-x-auto py-0.5">
        <button
          onClick={() => onTabChange('healthDashboard')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
            activeTab === 'healthDashboard'
              ? 'bg-amber-400 text-slate-950 shadow-sm font-bold'
              : 'hover:text-slate-200 hover:bg-slate-800/40 text-amber-300'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Health Dashboard
        </button>
        <button
          onClick={() => onTabChange('gantt')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'gantt'
              ? 'bg-slate-800 text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Gantt Timeline
        </button>
        <button
          onClick={() => onTabChange('activities')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'activities'
              ? 'bg-slate-800 text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Activity Sheet
        </button>
        <button
          onClick={() => onTabChange('wbs')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'wbs'
              ? 'bg-slate-800 text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          WBS Tree
        </button>
        <button
          onClick={() => onTabChange('dcma')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'dcma'
              ? 'bg-slate-800 text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          DCMA 14 Audit
        </button>
        <button
          onClick={() => onTabChange('resources')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'resources'
              ? 'bg-slate-800 text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Resources
        </button>
        <button
          onClick={() => onTabChange('raw')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'raw'
              ? 'bg-slate-800 text-slate-100 shadow-sm font-semibold'
              : 'hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Raw Tables (%T)
        </button>
      </nav>

      {/* Zone 3: Primary Action & Sample Selector */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Sample selector dropdown */}
        <select
          aria-label="Select sample project"
          className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-amber-500 hidden sm:block"
          onChange={(e) => {
            const sample = SAMPLE_PROJECTS.find((s) => s.id === e.target.value);
            if (sample) onSelectSample(sample);
          }}
          defaultValue=""
        >
          <option value="" disabled>Load Sample Project...</option>
          {SAMPLE_PROJECTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code}: {s.name}
            </option>
          ))}
        </select>

        {/* Export / Download button */}
        <button
          onClick={onDownloadXer}
          title="Export and Download valid .XER file"
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors hidden lg:flex items-center gap-1 text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Export .XER</span>
        </button>

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
