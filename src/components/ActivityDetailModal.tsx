import React from 'react';
import {
  Activity,
  ParsedProject,
} from '../types/xer';
import {
  X,
  Clock,
  Calendar as CalendarIcon,
  GitCommit,
  ArrowRight,
  ArrowLeft,
  Users,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface ActivityDetailModalProps {
  activity: Activity | null;
  project: ParsedProject;
  onClose: () => void;
  onSelectActivity: (activity: Activity) => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  project,
  onClose,
  onSelectActivity,
}) => {
  if (!activity) return null;

  const statusLabel =
    activity.status === 'TK_Complete'
      ? 'Completed'
      : activity.status === 'TK_Active'
      ? 'In Progress'
      : 'Not Started';

  const statusColor =
    activity.status === 'TK_Complete'
      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'
      : activity.status === 'TK_Active'
      ? 'text-sky-400 bg-sky-950/60 border-sky-800/60'
      : 'text-slate-400 bg-slate-900/60 border-slate-800';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                {activity.code}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${statusColor}`}>
                {statusLabel}
              </span>
              {activity.isCritical && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60">
                  <ShieldAlert className="w-3 h-3" />
                  Critical Path (TF: {activity.totalFloatDays}d)
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{activity.name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              WBS: <span className="text-slate-800 dark:text-slate-200 font-medium">{activity.wbsPath || `${activity.wbsCode} - ${activity.wbsName}`}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Original Duration</span>
              <span className="text-lg font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {activity.origDurationDays} <span className="text-xs text-slate-500 font-sans font-normal">days</span>
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Total Float</span>
              <span
                className={`text-lg font-mono font-bold tabular-nums ${
                  activity.totalFloatDays <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {activity.totalFloatDays} <span className="text-xs text-slate-500 font-sans font-normal">days</span>
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Physical % Complete</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {activity.physCompletePct}%
                </span>
                <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, activity.physCompletePct)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Remaining Duration</span>
              <span className="text-lg font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {activity.remainDurationDays} <span className="text-xs text-slate-500 font-sans font-normal">days</span>
              </span>
            </div>
          </div>

          {/* Schedule Dates Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-slate-500" />
              Schedule &amp; Float Dates
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950/30">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="py-2.5 px-4">Date Field</th>
                    <th className="py-2.5 px-4">Start</th>
                    <th className="py-2.5 px-4">Finish</th>
                    <th className="py-2.5 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  <tr>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-sans font-medium">Current / Planned</td>
                    <td className="py-2.5 px-4 text-slate-900 dark:text-slate-200 tabular-nums">{activity.startDate || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-900 dark:text-slate-200 tabular-nums">{activity.finishDate || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 font-sans text-[11px]">Active working dates</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-sans">Early Dates</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 tabular-nums">{activity.earlyStartDate || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 tabular-nums">{activity.earlyFinishDate || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 font-sans text-[11px]">Forward pass result</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-sans">Late Dates</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 tabular-nums">{activity.lateStartDate || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 tabular-nums">{activity.lateFinishDate || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 font-sans text-[11px]">Backward pass result</td>
                  </tr>
                  {activity.actualStartDate && (
                    <tr className="bg-emerald-50 dark:bg-emerald-950/20">
                      <td className="py-2.5 px-4 text-emerald-800 dark:text-emerald-300 font-sans font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Actual Progress
                      </td>
                      <td className="py-2.5 px-4 text-emerald-900 dark:text-emerald-300 tabular-nums font-semibold">{activity.actualStartDate}</td>
                      <td className="py-2.5 px-4 text-emerald-900 dark:text-emerald-300 tabular-nums font-semibold">{activity.actualFinishDate || 'In Progress'}</td>
                      <td className="py-2.5 px-4 text-emerald-700 dark:text-emerald-400 font-sans text-[11px]">Recorded actual execution</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Logic Relationships: Predecessors & Successors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Predecessors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <ArrowLeft className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  Predecessors ({activity.predecessors.length})
                </h3>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950/30 min-h-[120px]">
                {activity.predecessors.length === 0 ? (
                  <div className="p-4 text-center text-xs text-amber-600 dark:text-amber-400 flex flex-col items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>No predecessors (Open Start)</span>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-48 overflow-y-auto">
                    {activity.predecessors.map((p) => {
                      const predAct = project.activities.find((a) => a.id === p.predTaskId);
                      return (
                        <div
                          key={p.id}
                          onClick={() => predAct && onSelectActivity(predAct)}
                          className="p-3 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                                {p.predTaskCode || p.predTaskId}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {p.type.replace('PR_', '')}
                                {p.lagDays !== 0 && ` +${p.lagDays}d`}
                              </span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-300 font-medium truncate max-w-[220px]">
                              {p.predTaskName || (predAct ? predAct.name : 'Unknown Activity')}
                            </p>
                          </div>
                          <span className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold hover:underline">View &rarr;</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Successors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Successors ({activity.successors.length})
                </h3>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950/30 min-h-[120px]">
                {activity.successors.length === 0 ? (
                  <div className="p-4 text-center text-xs text-amber-600 dark:text-amber-400 flex flex-col items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>No successors (Open Finish)</span>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-48 overflow-y-auto">
                    {activity.successors.map((s) => {
                      const succAct = project.activities.find((a) => a.id === s.taskId);
                      return (
                        <div
                          key={s.id}
                          onClick={() => succAct && onSelectActivity(succAct)}
                          className="p-3 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                {s.predTaskCode || s.taskId}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {s.type.replace('PR_', '')}
                                {s.lagDays !== 0 && ` +${s.lagDays}d`}
                              </span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-300 font-medium truncate max-w-[220px]">
                              {s.predTaskName || (succAct ? succAct.name : 'Unknown Activity')}
                            </p>
                          </div>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">View &rarr;</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resource Assignments */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-500" />
              Resource Assignments ({activity.assignments.length})
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950/30">
              {activity.assignments.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No resources or material costs assigned to this activity in the XER file.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-semibold">
                      <th className="py-2.5 px-4">Resource Code</th>
                      <th className="py-2.5 px-4">Resource Name</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4 text-right">Target Units</th>
                      <th className="py-2.5 px-4 text-right">Target Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {activity.assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2 px-4 text-amber-600 dark:text-amber-400 font-medium">{a.resourceCode}</td>
                        <td className="py-2 px-4 text-slate-800 dark:text-slate-200 font-sans">{a.resourceName}</td>
                        <td className="py-2 px-4 text-slate-500 dark:text-slate-400 font-sans text-[11px]">
                          {a.resourceType === 'RT_Labor'
                            ? 'Labor'
                            : a.resourceType === 'RT_Mat'
                            ? 'Material'
                            : 'Non-Labor'}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-800 dark:text-slate-200 tabular-nums">
                          {a.targetUnits.toLocaleString()}
                        </td>
                        <td className="py-2 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                          ${a.targetCost.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Calendar & Constraints */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Assigned Calendar</span>
              <span className="text-slate-800 dark:text-slate-200 font-mono font-medium">{activity.calendarName || 'Standard 5-Day Workweek'}</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Constraint Logic</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">
                {activity.constraintType
                  ? `${activity.constraintType} on ${activity.constraintDate || ''}`
                  : 'As Soon As Possible (Standard CPM)'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Task ID: {activity.id} · Proj ID: {activity.projId}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
