import React from 'react';
import { ParsedProject } from '../types/xer';
import {
  Calendar,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Activity as ActivityIcon,
  HardHat,
  Award,
} from 'lucide-react';
import { ActiveTab } from './Navbar';

interface ProjectSummaryHeaderProps {
  project: ParsedProject;
  onNavigateToTab: (tab: ActiveTab) => void;
  isSampleActive?: boolean;
  onOpenUpload?: () => void;
}

export const ProjectSummaryHeader: React.FC<ProjectSummaryHeaderProps> = ({
  project,
  onNavigateToTab,
  isSampleActive = false,
  onOpenUpload,
}) => {
  const { metadata, stats, healthAudit } = project;

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs transition-colors">
      {/* Project Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold">
            {metadata.code}
          </span>
          <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">{metadata.name}</h1>
          {isSampleActive && (
            <span
              onClick={onOpenUpload}
              title="Click to upload your own .XER file"
              className="cursor-pointer text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1 hover:bg-amber-200 transition-colors"
            >
              <span>DEMO SAMPLE</span>
              <span className="underline ml-0.5">Upload Real .XER &rarr;</span>
            </span>
          )}
        </div>

        <span className="text-slate-300 dark:text-slate-600 hidden md:inline">·</span>

        <div className="hidden lg:flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>Data Date:</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">{metadata.dataDate || 'N/A'}</span>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="flex flex-wrap items-center gap-5 font-mono text-[11px]">
        {/* Total Activities */}
        <div
          onClick={() => onNavigateToTab('activities')}
          className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <ActivityIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Acts:</span>
          <span className="text-slate-900 dark:text-slate-100 font-bold tabular-nums">
            {stats.totalActivities.toLocaleString()}
          </span>
        </div>

        {/* Critical Path Count */}
        <div
          onClick={() => onNavigateToTab('gantt')}
          className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
          <span>Critical:</span>
          <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
            {stats.criticalCount.toLocaleString()}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <span>Progress:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-16 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${Math.min(100, stats.overallProgressPct)}%` }}
              />
            </div>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
              {stats.overallProgressPct}%
            </span>
          </div>
        </div>

        {/* Duration */}
        <div className="hidden sm:flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>Duration:</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold tabular-nums">{stats.totalDurationDays}d</span>
        </div>

        {/* DCMA Schedule Quality Grade */}
        <div
          onClick={() => onNavigateToTab('dcma')}
          className="flex items-center gap-1.5 cursor-pointer group transition-colors"
        >
          <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span className="text-slate-600 dark:text-slate-400">DCMA Audit:</span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
              healthAudit.grade === 'A'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                : healthAudit.grade === 'B'
                ? 'bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800'
                : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
            }`}
          >
            Grade {healthAudit.grade} ({healthAudit.overallScorePct}%)
          </span>
        </div>
      </div>
    </div>
  );
};
