import React from 'react';
import { P6HealthCheckDashboardData } from '../../types/healthCheck';
import { Check, ShieldCheck, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface ExecutiveScoreCardsProps {
  data: P6HealthCheckDashboardData;
}

export const ExecutiveScoreCards: React.FC<ExecutiveScoreCardsProps> = ({ data }) => {
  const { scoring } = data;

  const isRecheckRequired = !scoring.criticalGatePassed || scoring.criticalItemsFailedOrWarning > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. P6 SETTINGS */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between shadow-md hover:border-slate-700 transition-colors">
        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          P6 Settings
        </span>
        <div className="my-2">
          <span className="text-2xl lg:text-3xl font-mono font-bold text-sky-400 tabular-nums">
            {scoring.criteriaAScorePct.toFixed(1)}%
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          {scoring.criteriaAUnitsEarned.toFixed(1)} of {scoring.criteriaAUnitsAllotted.toFixed(1)} units
        </span>
      </div>

      {/* 2. SCHEDULE QUALITY & INTEGRITY */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between shadow-md hover:border-slate-700 transition-colors">
        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          Schedule Quality &amp; Integrity
        </span>
        <div className="my-2">
          <span className="text-2xl lg:text-3xl font-mono font-bold text-sky-400 tabular-nums">
            {scoring.criteriaBScorePct.toFixed(1)}%
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          {scoring.criteriaBUnitsEarned.toFixed(1)} of {scoring.criteriaBUnitsAllotted.toFixed(1)} applicable units
        </span>
      </div>

      {/* 3. CRITICAL-KEY ITEMS (YES) */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between shadow-md hover:border-slate-700 transition-colors">
        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          Critical-Key Items (Yes)
        </span>
        <div className="my-2">
          <span className="text-2xl lg:text-3xl font-mono font-bold text-indigo-400 tabular-nums">
            {scoring.criticalItemsCount}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          {scoring.criticalItemsPassed} passed | {scoring.criticalItemsFailedOrWarning} Fail
        </span>
      </div>

      {/* 4. TO RECHECK & RESUBMIT */}
      <div
        className={`p-4 rounded-xl flex flex-col justify-between shadow-md border transition-colors ${
          isRecheckRequired
            ? 'bg-rose-950/40 border-rose-600/80'
            : 'bg-emerald-950/20 border-emerald-800/60'
        }`}
      >
        <span
          className={`text-[11px] font-bold tracking-wider uppercase ${
            isRecheckRequired ? 'text-rose-400' : 'text-emerald-400'
          }`}
        >
          To Recheck &amp; Resubmit
        </span>
        <div className="my-2">
          <span
            className={`text-2xl lg:text-3xl font-mono font-bold tabular-nums ${
              isRecheckRequired ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {scoring.criticalItemsFailedOrWarning}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          {scoring.statusCounts.fail} Fail | {scoring.statusCounts.warning} Warning | {scoring.statusCounts.na} N/A overall
        </span>
      </div>

      {/* 5. OVERALL HEALTH SCORE */}
      <div className="p-4 bg-emerald-950/30 border border-emerald-800/80 rounded-xl flex flex-col justify-between shadow-md">
        <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
          Overall Health Score
        </span>
        <div className="my-2">
          <span className="text-2xl lg:text-3xl font-mono font-extrabold text-emerald-300 tabular-nums">
            {scoring.overallHealthScorePct.toFixed(1)}%
          </span>
        </div>
        <span className="text-[11px] font-mono text-emerald-400/80">
          {scoring.totalUnitsEarned.toFixed(1)} of {scoring.totalApplicableUnits.toFixed(1)} applicable units
        </span>
      </div>

      {/* 6. HEALTH RATING */}
      <div
        className={`p-4 rounded-xl flex flex-col justify-between shadow-md border ${
          scoring.healthRating === 'HEALTHY'
            ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
            : scoring.healthRating === 'ACCEPTABLE'
            ? 'bg-emerald-950/30 border-emerald-700 text-emerald-300'
            : scoring.healthRating === 'AT RISK'
            ? 'bg-amber-950/40 border-amber-600 text-amber-300'
            : 'bg-rose-950/40 border-rose-600 text-rose-300'
        }`}
      >
        <span className="text-[11px] font-bold tracking-wider uppercase opacity-80">
          Health Rating
        </span>
        <div className="my-2">
          <span className="text-xl lg:text-2xl font-bold font-mono tracking-tight">
            {scoring.healthRating}
          </span>
        </div>
        <div className="text-[10px] flex items-center gap-1 opacity-90">
          <span>Critical gate: {scoring.criticalGatePassed ? 'all critical items Pass ✔' : 'FAILED - Recheck ✗'}</span>
        </div>
      </div>
    </div>
  );
};
