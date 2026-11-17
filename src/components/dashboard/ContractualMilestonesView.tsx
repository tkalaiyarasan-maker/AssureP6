import React, { useState, useMemo } from 'react';
import { Activity, ParsedProject } from '../../types/xer';
import { extractMilestonesSummary, downloadCsvFile } from '../../utils/scheduleAnalysis';
import {
  Flag,
  Search,
  Download,
  GitBranch,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface ContractualMilestonesViewProps {
  project: ParsedProject;
  onSelectActivity: (act: Activity) => void;
  onTraceBackward: (act: Activity) => void;
}

export const ContractualMilestonesView: React.FC<ContractualMilestonesViewProps> = ({
  project,
  onSelectActivity,
  onTraceBackward,
}) => {
  const [filterMode, setFilterMode] = useState<'contractual' | 'all'>('contractual');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const allMilestones = useMemo(() => extractMilestonesSummary(project), [project]);

  const contractualCount = useMemo(
    () => allMilestones.filter((m) => m.isContractual).length,
    [allMilestones]
  );

  const filteredMilestones = useMemo(() => {
    return allMilestones.filter((m) => {
      if (filterMode === 'contractual' && !m.isContractual) return false;
      if (statusFilter === 'completed' && m.activity.status !== 'TK_Complete') return false;
      if (statusFilter === 'pending' && m.activity.status === 'TK_Complete') return false;
      if (statusFilter === 'critical' && !m.activity.isCritical && !m.activity.isLongestPath) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          m.activity.code.toLowerCase().includes(q) ||
          m.activity.name.toLowerCase().includes(q) ||
          m.activity.wbsPath.toLowerCase().includes(q) ||
          (m.activity.calendarName || '').toLowerCase().includes(q) ||
          m.matchedTag.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [allMilestones, filterMode, statusFilter, searchQuery]);

  const delayedCount = useMemo(
    () => filteredMilestones.filter((m) => m.varianceDays !== null && m.varianceDays > 0).length,
    [filteredMilestones]
  );

  const criticalCount = useMemo(
    () => filteredMilestones.filter((m) => m.activity.isCritical || m.activity.isLongestPath).length,
    [filteredMilestones]
  );

  const completedCount = useMemo(
    () => filteredMilestones.filter((m) => m.activity.status === 'TK_Complete').length,
    [filteredMilestones]
  );

  const handleExportCsv = () => {
    const headers = [
      'Activity ID',
      'Milestone Name',
      'Milestone Type',
      'Category Tag',
      'Contractual',
      'WBS Hierarchy',
      'Assigned Calendar',
      'Planned / Baseline Start',
      'Planned / Baseline Finish',
      'Forecast / Actual Start',
      'Forecast / Actual Finish',
      'Variance (Days)',
      'Total Float (Days)',
      'Constraint',
      'Status',
    ];

    const rows = filteredMilestones.map((m) => [
      m.activity.code,
      m.activity.name,
      m.milestoneType,
      m.matchedTag,
      m.isContractual ? 'Yes' : 'No',
      m.activity.wbsPath,
      m.activity.calendarName || 'Default',
      m.plannedStart || '-',
      m.plannedFinish || '-',
      m.forecastStart || '-',
      m.forecastFinish || '-',
      m.varianceDays === null ? '-' : m.varianceDays,
      m.activity.totalFloatDays,
      m.activity.constraintType ? `${m.activity.constraintType}${m.activity.constraintDate ? ` (${m.activity.constraintDate})` : ''}` : 'None',
      m.activity.status === 'TK_Complete' ? 'Completed' : m.activity.status === 'TK_Active' ? 'In Progress' : 'Not Started',
    ]);

    downloadCsvFile(
      `${project.metadata.code || 'project'}_Contractual_Milestones_Summary.csv`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Flag className="w-4 h-4 text-amber-500" />
            Contractual Milestones &amp; Key Dates Summary
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dedicated register of all contractual milestones, Key Dates (KD), and finish milestones with planned vs forecast dates, float, calendars, and one-click backward path tracing.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export Milestones CSV ({filteredMilestones.length})
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Contractual / Key Milestones
          </span>
          <span className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1 block">
            {contractualCount}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            of {allMilestones.length} total milestones
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Completed Milestones
          </span>
          <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1 block">
            {completedCount}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {filteredMilestones.length > 0 ? Math.round((completedCount / filteredMilestones.length) * 100) : 0}% achieved in view
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Critical / Longest Path
          </span>
          <span className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-1 block">
            {criticalCount}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Driving project finish
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Slippage vs Planned Date
          </span>
          <span className={`text-2xl font-mono font-bold tabular-nums mt-1 block ${delayedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {delayedCount}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Forecast later than baseline
          </span>
        </div>
      </div>

      {/* Filter Toolbar & Table */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-0.5 bg-slate-200/70 dark:bg-slate-900 border border-slate-300/70 dark:border-slate-800 rounded-lg text-xs">
              <button
                onClick={() => setFilterMode('contractual')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filterMode === 'contractual'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Contractual &amp; Key ({contractualCount})
              </button>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All Milestones ({allMilestones.length})
              </button>
            </div>

            <div className="flex items-center p-0.5 bg-slate-200/70 dark:bg-slate-900 border border-slate-300/70 dark:border-slate-800 rounded-lg text-xs">
              {(['all', 'pending', 'critical', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                    statusFilter === st
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search milestone ID, name, WBS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 w-60 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[540px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Activity ID</th>
                <th className="py-2.5 px-3 min-w-[240px]">Milestone &amp; WBS Hierarchy</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Type / Tag</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Calendar</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Planned Start</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Planned Finish</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Forecast Finish</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Var (d)</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Float (d)</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredMilestones.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    No milestones matched the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMilestones.map((m) => {
                  const act = m.activity;
                  return (
                    <tr
                      key={act.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap align-top">
                        <button
                          onClick={() => onSelectActivity(act)}
                          className="hover:underline flex items-center gap-1"
                          title="Inspect milestone details"
                        >
                          {act.code}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>
                        {act.status === 'TK_Complete' ? (
                          <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-sans font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Done
                          </span>
                        ) : act.isCritical ? (
                          <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-sans font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            Critical
                          </span>
                        ) : (
                          <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-sans font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <Clock className="w-2.5 h-2.5" /> Pending
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 align-top">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{act.name}</div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                          {act.wbsPath}
                        </div>
                        {act.constraintType && (
                          <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Constraint: {act.constraintType} {act.constraintDate || ''}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                          {m.milestoneType}
                        </div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70">
                          {m.matchedTag}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300">
                          <CalendarIcon className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]" title={act.calendarName || 'Default'}>
                            {act.calendarName || 'Default'}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap align-top">
                        {m.plannedStart || '-'}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap align-top">
                        {m.plannedFinish || '-'}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-900 dark:text-slate-100 font-semibold whitespace-nowrap align-top">
                        {m.forecastFinish || '-'}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-[11px] font-bold whitespace-nowrap align-top tabular-nums">
                        {m.varianceDays === null ? (
                          <span className="text-slate-400">-</span>
                        ) : m.varianceDays > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 inline-flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" />+{m.varianceDays}d
                          </span>
                        ) : m.varianceDays < 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">{m.varianceDays}d</span>
                        ) : (
                          <span className="text-slate-500">0d</span>
                        )}
                      </td>

                      <td
                        className={`py-2.5 px-2 text-right font-mono text-[11px] font-bold whitespace-nowrap align-top tabular-nums ${
                          act.totalFloatDays < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : act.totalFloatDays === 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {act.totalFloatDays}d
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap align-top">
                        <button
                          onClick={() => onTraceBackward(act)}
                          title="Trace driving backward predecessor chain for this milestone"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold transition-colors"
                        >
                          <GitBranch className="w-3 h-3" />
                          Trace Path
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
