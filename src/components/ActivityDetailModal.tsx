import React, { useMemo, useState } from 'react';
import {
  Activity,
  ParsedProject,
} from '../types/xer';
import { traceBackwardPath, formatCurrencyAmount } from '../utils/scheduleAnalysis';
import {
  X,
  Calendar as CalendarIcon,
  ArrowRight,
  ArrowLeft,
  Users,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
} from 'lucide-react';

interface ActivityDetailModalProps {
  activity: Activity | null;
  project: ParsedProject;
  onClose: () => void;
  onSelectActivity: (activity: Activity) => void;
  onOpenBackwardTrace?: (activity: Activity) => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  project,
  onClose,
  onSelectActivity,
  onOpenBackwardTrace,
}) => {
  const [showInlineBackward, setShowInlineBackward] = useState(false);

  const assignedCalendar = useMemo(() => {
    if (!activity) return undefined;
    return project.calendars.find((c) => c.id === activity.calendarId);
  }, [activity, project.calendars]);

  const backwardTrace = useMemo(() => {
    if (!activity || !showInlineBackward) return null;
    return traceBackwardPath(project, activity.id);
  }, [project, activity, showInlineBackward]);

  if (!activity) return null;

  const statusLabel =
    activity.status === 'TK_Complete'
      ? 'Completed'
      : activity.status === 'TK_Active'
      ? 'In Progress'
      : 'Not Started';

  const statusColor =
    activity.status === 'TK_Complete'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-950/60 dark:border-emerald-800/60'
      : activity.status === 'TK_Active'
      ? 'text-sky-700 bg-sky-50 border-sky-300 dark:text-sky-400 dark:bg-sky-950/60 dark:border-sky-800/60'
      : 'text-slate-600 bg-slate-100 border-slate-300 dark:text-slate-400 dark:bg-slate-900/60 dark:border-slate-800';

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
            <div className="flex flex-wrap items-center gap-2">
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
              <button
                onClick={() => setShowInlineBackward((v) => !v)}
                className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 hover:bg-amber-100 transition-colors"
              >
                <GitBranch className="w-3 h-3" />
                {showInlineBackward ? 'Hide Backward Path' : 'Trace Backward Path'}
              </button>
              {onOpenBackwardTrace && (
                <button
                  onClick={() => {
                    onOpenBackwardTrace(activity);
                    onClose();
                  }}
                  className="text-xs px-2.5 py-0.5 rounded-full border font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border-sky-300 dark:border-sky-800 hover:bg-sky-100 transition-colors"
                >
                  Open in Full Path Tracer &rarr;
                </button>
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
          {/* Inline Backward Driving Path Preview */}
          {showInlineBackward && backwardTrace && (
            <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4" />
                  Driving Backward Path ({backwardTrace.drivingChain.length} steps | {backwardTrace.totalUpstreamCount} total upstream tasks)
                </h3>
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  Start &rarr; Selected Target ({activity.code})
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-amber-200/60 dark:divide-amber-900/40 border border-amber-200 dark:border-amber-900/60 rounded-lg bg-white dark:bg-slate-950">
                {backwardTrace.drivingChain.map((step, idx) => (
                  <div
                    key={step.activity.id}
                    onClick={() => onSelectActivity(step.activity)}
                    className="px-3 py-2 flex items-center justify-between gap-3 text-xs hover:bg-amber-50/60 dark:hover:bg-slate-900 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{step.activity.code}</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{step.activity.name}</span>
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                        WBS: {step.activity.wbsPath || step.activity.wbsName} · Cal: {step.activity.calendarName || 'Unassigned'}
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px] shrink-0">
                      <div className="text-slate-700 dark:text-slate-300">
                        {step.activity.startDate || '—'} &rarr; {step.activity.finishDate || '—'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        TF: {step.activity.totalFloatDays}d {step.linkToSuccessorType ? `· ${step.linkToSuccessorType.replace('PR_', '')}${step.linkToSuccessorLagDays ? ` +${step.linkToSuccessorLagDays}d` : ''}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-sans font-medium">Current / Scheduled</td>
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
                      <th className="py-2.5 px-4 text-right">
                        Target Cost ({project.metadata.currencyCode || project.metadata.currencySymbol || 'USD'})
                      </th>
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
                          {formatCurrencyAmount(
                            a.targetCost,
                            project.metadata.currencySymbol,
                            project.metadata.currencyCode,
                            project.metadata.currencyDecimalDigits
                          )}
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
              <div className="flex items-center gap-2">
                <span className="text-slate-800 dark:text-slate-200 font-mono font-semibold">
                  {activity.calendarName || 'Unassigned'}
                </span>
                {assignedCalendar && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {assignedCalendar.typeLabel} · {assignedCalendar.hoursPerDay}h/d
                  </span>
                )}
              </div>
              {assignedCalendar && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Working: {assignedCalendar.workingWeekdays.join(', ')} | Holidays/Exceptions: {assignedCalendar.exceptionDates.length}
                </p>
              )}
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

