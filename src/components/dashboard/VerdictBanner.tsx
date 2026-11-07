import React from 'react';
import { P6HealthCheckDashboardData } from '../../types/healthCheck';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

interface VerdictBannerProps {
  data: P6HealthCheckDashboardData;
}

export const VerdictBanner: React.FC<VerdictBannerProps> = ({ data }) => {
  const { scoring } = data;
  const isAccepted = scoring.criticalGatePassed;

  return (
    <div
      className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-center text-center shadow-md transition-all ${
        isAccepted
          ? 'bg-amber-950/40 border-amber-600/70 text-amber-200'
          : 'bg-rose-950/50 border-rose-600 text-rose-200'
      }`}
    >
      <div className="flex items-center gap-2 text-xs md:text-sm font-bold tracking-wide">
        <span className="uppercase text-amber-400 font-extrabold">
          Submission Verdict:
        </span>
        <span
          className={`px-3 py-1 rounded-lg border font-mono text-xs md:text-sm ${
            isAccepted
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
              : 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
          }`}
        >
          {scoring.submissionVerdict}
        </span>
      </div>
    </div>
  );
};
