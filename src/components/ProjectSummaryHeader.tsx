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
}

export const ProjectSummaryHeader: React.FC<ProjectSummaryHeaderProps> = ({
  project,
  onNavigateToTab,
}) => {
  const { metadata, stats, healthAudit } = project;

  return (
    <div className="bg-slate-900/60 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
      {/* Project Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
            {metadata.code}
          </span>
          <h1 className="text-sm font-bold text-slate-100">{metadata.name}</h1>
        </div>

        <span className="text-slate-600 hidden md:inline">·</span>

        <div className="hidden lg:flex items-center gap-2 text-slate-400 font-mono text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>Data Date:</span>
          <span className="text-slate-200">{metadata.dataDate || 'N/A'}</span>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="flex flex-wrap items-center gap-5 font-mono text-[11px]">
        {/* Total Activities */}
        <div
          onClick={() => onNavigateToTab('activities')}
          className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ActivityIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>Acts:</span>
          <span className="text-slate-100 font-semibold tabular-nums">
            {stats.totalActivities}
          </span>
        </div>

        {/* Critical Path Count */}
        <div
          onClick={() => onNavigateToTab('gantt')}
          className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-rose-300 transition-colors"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Critical:</span>
          <span className="text-rose-400 font-bold tabular-nums">
            {stats.criticalCount}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 text-slate-400">
          <span>Progress:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${Math.min(100, stats.overallProgressPct)}%` }}
              />
            </div>
            <span className="text-emerald-400 font-semibold tabular-nums">
              {stats.overallProgressPct}%
            </span>
          </div>
        </div>

        {/* Duration */}
        <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Duration:</span>
          <span className="text-slate-200 tabular-nums">{stats.totalDurationDays}d</span>
        </div>

        {/* DCMA Schedule Quality Grade */}
        <div
          onClick={() => onNavigateToTab('dcma')}
          className="flex items-center gap-1.5 cursor-pointer group transition-colors"
        >
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">DCMA Audit:</span>
          <span
            className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
              healthAudit.grade === 'A'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : healthAudit.grade === 'B'
                ? 'bg-sky-950 text-sky-400 border border-sky-800'
                : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}
          >
            Grade {healthAudit.grade} ({healthAudit.overallScorePct}%)
          </span>
        </div>
      </div>
    </div>
  );
};
