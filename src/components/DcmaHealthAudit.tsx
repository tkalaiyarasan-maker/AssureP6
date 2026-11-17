import React, { useState, useEffect } from 'react';
import { Activity, DcmaCheckItem, ParsedProject } from '../types/xer';
import { downloadCsvFile } from '../utils/scheduleAnalysis';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Award,
  Info,
  Copy,
  Check,
  Download,
} from 'lucide-react';

interface DcmaHealthAuditProps {
  project: ParsedProject;
  onSelectActivity: (activity: Activity) => void;
  initialExpandedCheckId?: number | null;
}

export const DcmaHealthAudit: React.FC<DcmaHealthAuditProps> = ({
  project,
  onSelectActivity,
  initialExpandedCheckId = null,
}) => {
  const { healthAudit } = project;
  const [expandedCheckId, setExpandedCheckId] = useState<number | null>(initialExpandedCheckId);
  const [copiedCheckId, setCopiedCheckId] = useState<number | 'all' | null>(null);

  useEffect(() => {
    if (initialExpandedCheckId) {
      setExpandedCheckId(initialExpandedCheckId);
    }
  }, [initialExpandedCheckId]);

  const toggleExpand = (id: number) => {
    setExpandedCheckId((prev) => (prev === id ? null : id));
  };

  const handleCopyCheckList = async (check: DcmaCheckItem) => {
    const header = `DCMA #${check.id}: ${check.name} | Actual: ${check.actualCount} (${check.actualPct}%) | Target: ${check.threshold}`;
    const cols = ['Code', 'Activity / Link', 'WBS Hierarchy', 'Calendar', 'Start', 'Finish', 'Total Float (d)', 'Deficiency Reason'].join('\t');
    const lines = check.affectedActivities.map((item) =>
      [
        item.code,
        item.name,
        item.wbsPath || '—',
        item.calendarName || '—',
        item.startDate || '—',
        item.finishDate || '—',
        item.totalFloatDays !== undefined ? item.totalFloatDays : '—',
        item.reason,
      ].join('\t')
    );
    const text = [header, cols, ...lines].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCheckId(check.id);
      setTimeout(() => setCopiedCheckId(null), 2000);
    } catch {
      // Fallback if clipboard API blocked
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedCheckId(check.id);
      setTimeout(() => setCopiedCheckId(null), 2000);
    }
  };

  const handleDownloadCheckCsv = (check: DcmaCheckItem) => {
    const slug = check.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    downloadCsvFile(
      `${project.metadata.code}_DCMA_${String(check.id).padStart(2, '0')}_${slug}.csv`,
      [
        'DCMA Check #',
        'DCMA Parameter',
        'Standard Threshold',
        'Actual %',
        'Status',
        'Activity / Link Code',
        'Activity Name',
        'WBS Hierarchy',
        'Assigned Calendar',
        'Start Date',
        'Finish Date',
        'Total Float (Days)',
        'Deficiency Reason',
      ],
      check.affectedActivities.map((item) => [
        check.id,
        check.name,
        check.threshold,
        `${check.actualPct}%`,
        check.severity.toUpperCase(),
        item.code,
        item.name,
        item.wbsPath || '',
        item.calendarName || '',
        item.startDate || '',
        item.finishDate || '',
        item.totalFloatDays ?? '',
        item.reason,
      ])
    );
  };

  const handleDownloadAllDcmaCsv = () => {
    const rows: (string | number | undefined)[][] = [];
    for (const check of healthAudit.checks) {
      if (check.affectedActivities.length === 0) {
        rows.push([
          check.id,
          check.name,
          check.threshold,
          check.actualCount,
          `${check.actualPct}%`,
          check.severity.toUpperCase(),
          '—',
          'No non-compliant items',
          '',
          '',
          '',
          '',
          '',
          'Compliant',
        ]);
      } else {
        for (const item of check.affectedActivities) {
          rows.push([
            check.id,
            check.name,
            check.threshold,
            check.actualCount,
            `${check.actualPct}%`,
            check.severity.toUpperCase(),
            item.code,
            item.name,
            item.wbsPath || '',
            item.calendarName || '',
            item.startDate || '',
            item.finishDate || '',
            item.totalFloatDays ?? '',
            item.reason,
          ]);
        }
      }
    }
    downloadCsvFile(
      `${project.metadata.code}_DCMA_14Point_Full_NonCompliant_Report.csv`,
      [
        'Check #',
        'DCMA Parameter',
        'Threshold',
        'Count',
        'Actual %',
        'Status',
        'Activity / Link Code',
        'Activity Name',
        'WBS Hierarchy',
        'Assigned Calendar',
        'Start Date',
        'Finish Date',
        'Total Float (Days)',
        'Deficiency Reason',
      ],
      rows
    );
  };

  const handleCopyAllSummary = async () => {
    const lines = [
      `Assure P6 — DCMA 14-Point Audit Report (${project.metadata.code}: ${project.metadata.name})`,
      `Overall Compliance: ${healthAudit.overallScorePct}% (Grade ${healthAudit.grade}) | Data Date: ${project.metadata.dataDate || 'N/A'}`,
      '',
      ['#', 'Parameter', 'Standard', 'Actual', 'Status', 'Non-Compliant Items'].join('\t'),
      ...healthAudit.checks.map((c) =>
        [
          c.id,
          c.name,
          c.threshold,
          `${c.actualCount} (${c.actualPct}%)`,
          c.severity.toUpperCase(),
          c.affectedActivities.length,
        ].join('\t')
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedCheckId('all');
      setTimeout(() => setCopiedCheckId(null), 2000);
    } catch {
      // ignore
    }
  };

  const gradeBadgeColor =
    healthAudit.grade === 'A'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-950/80 dark:border-emerald-700/60'
      : healthAudit.grade === 'B'
      ? 'text-blue-700 bg-sky-50 border-sky-300 dark:text-sky-400 dark:bg-sky-950/80 dark:border-sky-700/60'
      : healthAudit.grade === 'C'
      ? 'text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-400 dark:bg-amber-950/80 dark:border-amber-700/60'
      : 'text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-400 dark:bg-rose-950/80 dark:border-rose-700/60';

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              DCMA 14-Point Schedule Quality &amp; Health Audit
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Industry standard Defense Contract Management Agency (DCMA) metric assessment with per-check and full non-compliant export.
          </p>
        </div>

        {/* Actions + Big Grade & Score Card */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyAllSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {copiedCheckId === 'all' ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            )}
            {copiedCheckId === 'all' ? 'Copied Summary!' : 'Copy Summary'}
          </button>

          <button
            onClick={handleDownloadAllDcmaCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Full Non-Compliant CSV
          </button>

          <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Overall Compliance</span>
              <span className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
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
      </div>

      {/* Summary Note Banner */}
      <div className="px-5 py-3 bg-slate-100/70 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Info className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
          <span>{healthAudit.summaryNote}</span>
        </div>
        <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] shrink-0">
          Data Date: <span className="text-slate-800 dark:text-slate-200 font-semibold">{project.metadata.dataDate || 'N/A'}</span>
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
                ? 'border-slate-200 bg-slate-50/60 hover:border-emerald-300 dark:border-emerald-800/40 dark:bg-slate-900/60 dark:hover:border-emerald-700/60'
                : check.severity === 'warning'
                ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300 dark:border-amber-800/50 dark:bg-slate-900/60 dark:hover:border-amber-700/70'
                : 'border-rose-200 bg-rose-50/40 hover:border-rose-300 dark:border-rose-800/60 dark:bg-rose-950/15 dark:hover:border-rose-700/80';

            return (
              <div
                key={check.id}
                className={`border rounded-xl p-4 transition-all shadow-sm ${statusBg}`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500 font-semibold">
                        #{check.id.toString().padStart(2, '0')}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">{check.name}</h3>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {check.description}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 text-right space-y-1">
                    {check.severity === 'pass' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-400 px-2 py-0.5 rounded-full dark:bg-emerald-950/70 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Pass
                      </span>
                    ) : check.severity === 'warning' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-400 px-2 py-0.5 rounded-full dark:bg-amber-950/70 dark:border-amber-800">
                        <AlertTriangle className="w-3 h-3" /> Warning
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-400 px-2 py-0.5 rounded-full dark:bg-rose-950/70 dark:border-rose-800">
                        <XCircle className="w-3 h-3" /> Fail
                      </span>
                    )}
                  </div>
                </div>

                {/* Score & Threshold Strip + Export Controls */}
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-500 dark:text-slate-400">
                      Standard: <span className="text-slate-800 dark:text-slate-300 font-semibold">{check.threshold}</span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Actual:{' '}
                      <span
                        className={`font-semibold tabular-nums ${
                          check.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {check.actualCount} ({check.actualPct}%)
                      </span>
                    </span>
                  </div>

                  {hasAffected && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyCheckList(check)}
                        title="Copy non-compliant activities to clipboard"
                        className="flex items-center gap-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        {copiedCheckId === check.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownloadCheckCsv(check)}
                        title="Download non-compliant activities CSV report"
                        className="flex items-center gap-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Download className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>CSV</span>
                      </button>

                      <button
                        onClick={() => toggleExpand(check.id)}
                        className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-sky-400 hover:underline transition-colors"
                      >
                        <span>
                          {isExpanded ? 'Hide' : 'View'} {check.affectedActivities.length}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Activity List Accordion */}
                {isExpanded && hasAffected && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 max-h-56 overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Non-Compliant Activities ({check.affectedActivities.length}):
                      </span>
                    </div>
                    {check.affectedActivities.map((item, idx) => {
                      const fullAct = project.activities.find((a) => a.id === item.id || a.code === item.code);
                      return (
                        <div
                          key={idx}
                          onClick={() => fullAct && onSelectActivity(fullAct)}
                          className="p-2 rounded bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs hover:border-slate-400 dark:hover:border-slate-700 cursor-pointer transition-colors shadow-xs"
                        >
                          <div className="space-y-0.5 truncate max-w-[78%]">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold">{item.code}</span>
                              <span className="text-slate-800 dark:text-slate-300 truncate font-medium">{item.name}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {item.reason}
                              {item.calendarName ? ` · Cal: ${item.calendarName}` : ''}
                            </p>
                          </div>
                          <span className="text-[11px] text-blue-600 dark:text-sky-400 font-medium shrink-0 hover:underline">
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

