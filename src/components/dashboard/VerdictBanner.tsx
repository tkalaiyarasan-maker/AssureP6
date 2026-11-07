import React from 'react';
import { P6HealthCheckDashboardData } from '../../types/healthCheck';

interface VerdictBannerProps {
  data: P6HealthCheckDashboardData;
}

export const VerdictBanner: React.FC<VerdictBannerProps> = ({ data }) => {
  const { scoring } = data;
  const isAccepted = scoring.criticalGatePassed;

  return (
    <div
      className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-center text-center shadow-sm transition-all ${
        isAccepted
          ? 'bg-amber-100/90 border-amber-300/90 text-amber-950 dark:bg-amber-950/40 dark:border-amber-600/70 dark:text-amber-200'
          : 'bg-rose-100 border-rose-300 text-rose-950 dark:bg-rose-950/50 dark:border-rose-600 dark:text-rose-200'
      }`}
    >
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm font-bold tracking-wide">
        <span className="uppercase text-amber-900 dark:text-amber-400 font-extrabold">
          Submission Verdict:
        </span>
        <span
          className={`px-3 py-1 rounded-lg border font-mono text-xs md:text-sm shadow-sm ${
            isAccepted
              ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-600'
              : 'bg-rose-200 text-rose-900 border-rose-500 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-600 animate-pulse'
          }`}
        >
          {scoring.submissionVerdict}
        </span>
      </div>
    </div>
  );
};
