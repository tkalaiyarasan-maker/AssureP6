import React from 'react';
import { P6HealthCheckDashboardData } from '../../types/healthCheck';
import { Info, ArrowUpRight } from 'lucide-react';

export interface DashboardNavigationRequest {
  workspaceTab?: 'healthDashboard' | 'gantt' | 'activities' | 'wbs' | 'dcma' | 'resources';
  dashboardSubTab?:
    | 'overview'
    | 'insights'
    | 'distributions'
    | 'checklist'
    | 'ranked'
    | 'milestones'
    | 'obligations'
    | 'calendars'
    | 'paths';
  checklistFilter?: 'all' | 'critical' | 'deficiencies' | 'criteriaA' | 'criteriaB';
  themeFilter?: string;
  highlightParamId?: string;
  dcmaCheckId?: number;
  backwardTargetId?: string;
}

interface ExecutiveScoreCardsProps {
  data: P6HealthCheckDashboardData;
  onNavigate?: (req: DashboardNavigationRequest) => void;
  onOpenGuide?: () => void;
}

export const ExecutiveScoreCards: React.FC<ExecutiveScoreCardsProps> = ({
  data,
  onNavigate,
  onOpenGuide,
}) => {
  const { scoring } = data;

  const isRecheckRequired = !scoring.criticalGatePassed || scoring.criticalItemsFailedOrWarning > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. P6 SETTINGS */}
      <button
        type="button"
        onClick={() => onNavigate?.({ dashboardSubTab: 'checklist', checklistFilter: 'criteriaA' })}
        className="text-left p-4 bg-indigo-50/70 dark:bg-slate-900/90 border border-indigo-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-sky-500 rounded-xl flex flex-col justify-between shadow-sm dark:shadow-md transition-all group cursor-pointer"
        title="Click to inspect Criteria A: P6 Settings (15 parameters)"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-bold tracking-wider text-slate-700 dark:text-slate-400 uppercase">
            P6 Settings
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="my-2">
          <span className="text-2xl lg:text-3xl font-mono font-bold text-blue-600 dark:text-sky-400 tabular-nums">
            {Math.min(100.0, scoring.criteriaAScorePct).toFixed(1)}%
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-600 dark:text-slate-500">
          {Math.min(scoring.criteriaAUnitsAllotted, scoring.criteriaAUnitsEarned).toFixed(1)} of {scoring.criteriaAUnitsAllotted.toFixed(1)} units
        </span>
      </button>

      {/* 2. SCHEDULE QUALITY & INTEGRITY */}
      <button
        type="button"
        onClick={() => onNavigate?.({ dashboardSubTab: 'checklist', checklistFilter: 'criteriaB' })}
        className="text-left p-4 bg-sky-50/70 dark:bg-slate-900/90 border border-sky-200/80 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 rounded-xl flex flex-col justify-between shadow-sm dark:shadow-md transition-all group cursor-pointer"
        title="Click to inspect Criteria B: Schedule Quality & Integrity (39 parameters)"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-bold tracking-wider text-slate-700 dark:text-slate-400 uppercase">
            Schedule Quality &amp; Integrity
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="my-2">
          <span className="text-2xl lg:text-3xl font-mono font-bold text-blue-600 dark:text-sky-400 tabular-nums">
            {Math.min(100.0, scoring.criteriaBScorePct).toFixed(1)}%
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-600 dark:text-slate-500">
          {Math.min(scoring.criteriaBUnitsAllotted, scoring.criteriaBUnitsEarned).toFixed(1)} of {scoring.criteriaBUnitsAllotted.toFixed(1)} applicable units
        </span>
      </button>

      {/* 3. CRITICAL-KEY ITEMS (YES) */}
      <button
        type="button"
        onClick={() => onNavigate?.({ dashboardSubTab: 'checklist', checklistFilter: 'critical' })}
        className="text-left p-4 bg-indigo-50/70 dark:bg-slate-900/90 border border-indigo-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl flex flex-col justify-between shadow-sm dark:shadow-md transition-all group cursor-pointer"
        title="Click to view the 20 Critical-Key (2.0x weighted) parameters"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-bold tracking-wider text-slate-700 dark:text-slate-400 uppercase">
            Critical-Key Items (Yes)
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="my-2">
          <span className="text-2xl lg:text-3xl font-mono font-bold text-blue-600 dark:text-indigo-400 tabular-nums">
            {scoring.criticalItemsCount}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-600 dark:text-slate-500">
          {scoring.criticalItemsPassed} passed | {scoring.criticalItemsFailedOrWarning} Fail
        </span>
      </button>

      {/* 4. TO RECHECK & RESUBMIT */}
      <button
        type="button"
        onClick={() => onNavigate?.({ dashboardSubTab: 'ranked' })}
        className={`text-left p-4 rounded-xl flex flex-col justify-between shadow-sm dark:shadow-md border transition-all group cursor-pointer ${
          isRecheckRequired
            ? 'bg-rose-50 border-rose-300 hover:border-rose-500 text-rose-950 dark:bg-rose-950/40 dark:border-rose-600/80 dark:text-rose-400'
            : 'bg-emerald-50/80 border-emerald-300 hover:border-emerald-500 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-800/60 dark:text-emerald-400'
        }`}
        title="Click to jump to Ranked Priority Deficiencies"
      >
        <div className="flex items-center justify-between w-full">
          <span
            className={`text-[11px] font-bold tracking-wider uppercase ${
              isRecheckRequired ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-800 dark:text-emerald-400'
            }`}
          >
            To Recheck &amp; Resubmit
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="my-2">
          <span
            className={`text-2xl lg:text-3xl font-mono font-bold tabular-nums ${
              isRecheckRequired ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {scoring.criticalItemsFailedOrWarning}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-600 dark:text-slate-500">
          {scoring.statusCounts.fail} Fail | {scoring.statusCounts.warning} Warning | {scoring.statusCounts.na} N/A overall
        </span>
      </button>

      {/* 5. OVERALL HEALTH SCORE */}
      <button
        type="button"
        onClick={() => onOpenGuide?.()}
        className="text-left p-4 bg-emerald-100/90 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500 rounded-xl flex flex-col justify-between shadow-sm dark:shadow-md transition-all group cursor-pointer"
        title="Click for Health Score formula & weighting explanation"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-bold tracking-wider text-emerald-900 dark:text-emerald-400 uppercase">
            Overall Health Score
          </span>
          <Info className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 opacity-75 group-hover:opacity-100" />
        </div>
        <div className="my-2">
          <span className="text-2xl lg:text-3xl font-mono font-extrabold text-emerald-800 dark:text-emerald-300 tabular-nums">
            {scoring.overallHealthScorePct.toFixed(1)}%
          </span>
        </div>
        <span className="text-[11px] font-mono text-emerald-900/80 dark:text-emerald-400/80">
          {scoring.totalUnitsEarned.toFixed(1)} of {scoring.totalApplicableUnits.toFixed(1)} applicable units
        </span>
      </button>

      {/* 6. HEALTH RATING */}
      <button
        type="button"
        onClick={() => onOpenGuide?.()}
        className={`text-left p-4 rounded-xl flex flex-col justify-between shadow-sm dark:shadow-md border transition-all group cursor-pointer ${
          scoring.healthRating === 'HEALTHY'
            ? 'bg-emerald-100/90 border-emerald-400 hover:border-emerald-600 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-600 dark:text-emerald-300'
            : scoring.healthRating === 'ACCEPTABLE'
            ? 'bg-emerald-100/90 border-emerald-400 hover:border-emerald-600 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-300'
            : scoring.healthRating === 'AT RISK'
            ? 'bg-amber-100/90 border-amber-400 hover:border-amber-600 text-amber-900 dark:bg-amber-950/40 dark:border-amber-600 dark:text-amber-300'
            : 'bg-rose-100/90 border-rose-400 hover:border-rose-600 text-rose-900 dark:bg-rose-950/40 dark:border-rose-600 dark:text-rose-300'
        }`}
        title="Click for Health Rating bands & Critical-Key Gate interpretation"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-bold tracking-wider uppercase opacity-90">
            Health Rating
          </span>
          <Info className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" />
        </div>
        <div className="my-1.5">
          <span className="text-xl lg:text-2xl font-bold font-mono tracking-tight block">
            {scoring.healthRating}
          </span>
          <span className="text-[10px] opacity-80 block mt-0.5">
            {scoring.criticalGatePassed ? 'Bands: ≥85 Healthy | 70–84 Accept.' : 'Capped by Critical-Key Gate failure'}
          </span>
        </div>
        <div className="text-[10px] flex items-center gap-1 opacity-90 font-medium">
          <span>Critical gate: {scoring.criticalGatePassed ? 'all critical items Pass ✔' : 'FAILED - Recheck ✗'}</span>
        </div>
      </button>
    </div>
  );
};

