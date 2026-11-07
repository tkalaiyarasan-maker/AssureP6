import React, { useState } from 'react';
import { Activity, DcmaCheckItem, ParsedProject } from '../types/xer';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Award,
  Info,
} from 'lucide-react';

interface DcmaHealthAuditProps {
  project: ParsedProject;
  onSelectActivity: (activity: Activity) => void;
}

export const DcmaHealthAudit: React.FC<DcmaHealthAuditProps> = ({
  project,
  onSelectActivity,
}) => {
  const { healthAudit } = project;
  const [expandedCheckId, setExpandedCheckId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedCheckId((prev) => (prev === id ? null : id));
  };

  const gradeBadgeColor =
    healthAudit.grade === 'A'
      ? 'text-emerald-400 bg-emerald-950/80 border-emerald-700/60'
      : healthAudit.grade === 'B'
      ? 'text-sky-400 bg-sky-950/80 border-sky-700/60'
      : healthAudit.grade === 'C'
      ? 'text-amber-400 bg-amber-950/80 border-amber-700/60'
      : 'text-rose-400 bg-rose-950/80 border-rose-700/60';

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">
              DCMA 14-Point Schedule Quality &amp; Health Audit
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Industry standard Defense Contract Management Agency (DCMA) metric assessment for Primavera P6 schedules.
          </p>
        </div>

        {/* Big Grade & Score Card */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Overall Compliance</span>
            <span className="text-2xl font-mono font-bold text-slate-100 tabular-nums">
              {healthAudit.overallScorePct}%
            </span>
          </div>

          <div
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border font-bold text-2xl font-mono shadow-inner ${gradeBadgeColor}`}
          >
            <span>{healthAudit.grade}</span>
          </div>
        </div>
      </div>

      {/* Summary Note Banner */}
      <div className="px-5 py-3 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{healthAudit.summaryNote}</span>
        </div>
        <div className="text-slate-400 font-mono text-[11px] shrink-0">
          Data Date: <span className="text-slate-200">{project.metadata.dataDate || 'N/A'}</span>
        </div>
      </div>

      {/* 14 Check Grid */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {healthAudit.checks.map((check: DcmaCheckItem) => {
            const isExpanded = expandedCheckId === check.id;
            const hasAffected = check.affectedActivities.length > 0;

            const statusBg =
              check.severity === 'pass'
                ? 'border-emerald-800/40 bg-slate-900/60 hover:border-emerald-700/60'
                : check.severity === 'warning'
                ? 'border-amber-800/50 bg-slate-900/60 hover:border-amber-700/70'
                : 'border-rose-800/60 bg-rose-950/15 hover:border-rose-700/80';

            return (
              <div
                key={check.id}
                className={`border rounded-xl p-4 transition-all ${statusBg}`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500 font-semibold">
                        #{check.id.toString().padStart(2, '0')}
                      </span>
                      <h3 className="text-xs font-bold text-slate-100">{check.name}</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {check.description}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 text-right space-y-1">
                    {check.severity === 'pass' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Pass
                      </span>
                    ) : check.severity === 'warning' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-800">
                        <AlertTriangle className="w-3 h-3" /> Warning
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-800">
                        <XCircle className="w-3 h-3" /> Fail
                      </span>
                    )}
                  </div>
                </div>

                {/* Score & Threshold Strip */}
                <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-400">
                      Standard: <span className="text-slate-300 font-semibold">{check.threshold}</span>
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">
                      Actual:{' '}
                      <span
                        className={`font-semibold tabular-nums ${
                          check.passed ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {check.actualCount} ({check.actualPct}%)
                      </span>
                    </span>
                  </div>

                  {hasAffected && (
                    <button
                      onClick={() => toggleExpand(check.id)}
                      className="flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      <span>
                        {isExpanded ? 'Hide' : 'View'} {check.affectedActivities.length} Tasks
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Expanded Activity List Accordion */}
                {isExpanded && hasAffected && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 max-h-48 overflow-y-auto">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Non-Compliant Activities:
                    </span>
                    {check.affectedActivities.map((item, idx) => {
                      const fullAct = project.activities.find((a) => a.id === item.id || a.code === item.code);
                      return (
                        <div
                          key={idx}
                          onClick={() => fullAct && onSelectActivity(fullAct)}
                          className="p-2 rounded bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 cursor-pointer transition-colors"
                        >
                          <div className="space-y-0.5 truncate max-w-[75%]">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-amber-400 font-semibold">{item.code}</span>
                              <span className="text-slate-300 truncate">{item.name}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{item.reason}</p>
                          </div>
                          <span className="text-[11px] text-sky-400 font-medium shrink-0 hover:underline">
                            Inspect &rarr;
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
