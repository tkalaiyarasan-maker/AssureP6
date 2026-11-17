import React, { useState, useMemo, useEffect } from 'react';
import { Activity, LongestPathChain, ParsedProject } from '../../types/xer';
import {
  sortActivitiesChronologically,
  traceBackwardPath,
  downloadCsvFile,
} from '../../utils/scheduleAnalysis';
import {
  Route,
  GitBranch,
  Download,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Search,
  Calendar as CalendarIcon,
  Layers,
  ExternalLink,
  ArrowRight,
  Flag,
} from 'lucide-react';

interface LongestAndBackwardPathsViewProps {
  project: ParsedProject;
  initialTargetActivityId?: string | null;
  onSelectActivity: (act: Activity) => void;
}

export const LongestAndBackwardPathsView: React.FC<LongestAndBackwardPathsViewProps> = ({
  project,
  initialTargetActivityId,
  onSelectActivity,
}) => {
  const [activeMode, setActiveMode] = useState<'longest' | 'backward'>(
    initialTargetActivityId ? 'backward' : 'longest'
  );

  // Longest / Subsequent Paths state
  const chains: LongestPathChain[] = project.longestPaths || [];
  const [selectedChainRank, setSelectedChainRank] = useState<number>(chains[0]?.rank || 1);
  const [pathSortMode, setPathSortMode] = useState<'start' | 'finish' | 'float'>('start');

  // Backward Path Tracer state
  const defaultMilestoneOrTerminal = useMemo(() => {
    const finishMilestone =
      project.activities.find((a) => a.type === 'TT_FinMile' && a.isLongestPath) ||
      project.activities.find((a) => a.type === 'TT_FinMile') ||
      project.activities.find((a) => a.type === 'TT_Mile' && a.successors.length === 0) ||
      project.activities.find((a) => a.isLongestPath && a.successors.length === 0) ||
      project.activities[project.activities.length - 1];
    return finishMilestone?.id || '';
  }, [project.activities]);

  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    initialTargetActivityId || defaultMilestoneOrTerminal
  );
  const [targetSearch, setTargetSearch] = useState('');
  const [showFullUpstreamNetwork, setShowFullUpstreamNetwork] = useState(false);

  // Sync external deep-link trace trigger
  useEffect(() => {
    if (initialTargetActivityId) {
      setSelectedTargetId(initialTargetActivityId);
      setActiveMode('backward');
    }
  }, [initialTargetActivityId]);

  const taskMap = useMemo(() => {
    const m = new Map<string, Activity>();
    for (const a of project.activities) m.set(a.id, a);
    return m;
  }, [project.activities]);

  const selectedChain = useMemo(
    () => chains.find((c) => c.rank === selectedChainRank) || chains[0],
    [chains, selectedChainRank]
  );

  const selectedChainActivities = useMemo(() => {
    if (!selectedChain) return [];
    const raw = selectedChain.activityIds.map((id) => taskMap.get(id)).filter((a): a is Activity => !!a);
    return sortActivitiesChronologically(raw, pathSortMode);
  }, [selectedChain, taskMap, pathSortMode]);

  const quickPickTargets = useMemo(() => {
    const milestones = project.activities
      .filter((a) => a.type === 'TT_FinMile' || a.type === 'TT_Mile')
      .slice(0, 8);
    const terminals = project.activities
      .filter((a) => a.successors.length === 0 && a.type === 'TT_Task')
      .sort((a, b) => (b.finishDate || '').localeCompare(a.finishDate || ''))
      .slice(0, 4);
    const seen = new Set<string>();
    const combined: Activity[] = [];
    for (const a of [...milestones, ...terminals]) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        combined.push(a);
      }
    }
    return combined;
  }, [project.activities]);

  const matchingTargets = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    if (!q) return project.activities.slice(0, 60);
    return project.activities
      .filter(
        (a) =>
          a.code.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.wbsPath.toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [project.activities, targetSearch]);

  const backwardTrace = useMemo(() => {
    if (!selectedTargetId) return null;
    return traceBackwardPath(project, selectedTargetId);
  }, [project, selectedTargetId]);

  const handleExportPathCsv = () => {
    if (!selectedChain) return;
    const headers = [
      'Seq #',
      'Path Rank',
      'Path Name',
      'Validation Status',
      'Activity ID',
      'Activity Name',
      'WBS Hierarchy',
      'Assigned Calendar',
      'Start Date',
      'Finish Date',
      'Duration (d)',
      'Total Float (d)',
      'Status',
    ];
    const rows = selectedChainActivities.map((a, idx) => [
      idx + 1,
      `Path #${selectedChain.rank}`,
      selectedChain.name,
      selectedChain.validationStatus,
      a.code,
      a.name,
      a.wbsPath,
      a.calendarName || 'Default',
      a.startDate || '-',
      a.finishDate || '-',
      a.origDurationDays,
      a.totalFloatDays,
      a.status === 'TK_Complete' ? 'Completed' : a.status === 'TK_Active' ? 'In Progress' : 'Not Started',
    ]);
    downloadCsvFile(
      `${project.metadata.code || 'project'}_Longest_Path_${selectedChain.rank}.csv`,
      headers,
      rows
    );
  };

  const handleExportBackwardCsv = () => {
    if (!backwardTrace) return;
    const nodes = showFullUpstreamNetwork
      ? backwardTrace.allUpstreamNodes
      : backwardTrace.drivingChain;
    const headers = [
      'Hop (from Target)',
      'Driving Chain Member',
      'Activity ID',
      'Activity Name',
      'WBS Hierarchy',
      'Assigned Calendar',
      'Start Date',
      'Finish Date',
      'Total Float (d)',
      'Link Type -> Succ',
      'Lag (d)',
      'Successor Code',
    ];
    const rows = nodes.map((n) => [
      n.hop,
      n.isOnDrivingChain ? 'Yes' : 'No',
      n.activity.code,
      n.activity.name,
      n.activity.wbsPath,
      n.activity.calendarName || 'Default',
      n.activity.startDate || '-',
      n.activity.finishDate || '-',
      n.activity.totalFloatDays,
      n.linkToSuccessorType ? n.linkToSuccessorType.replace('PR_', '') : '-',
      n.linkToSuccessorLagDays ?? 0,
      n.linkToSuccessorCode || '-',
    ]);
    downloadCsvFile(
      `${project.metadata.code || 'project'}_Backward_Trace_${backwardTrace.target.code}.csv`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-4">
      {/* Header & Mode Switcher */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Route className="w-4 h-4 text-rose-500" />
            Longest Path, Subsequent Paths &amp; Backward Predecessor Tracer
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Chronologically inspect Primary &amp; Subsequent Longest Paths (#1–#{chains.length || 1}) with full WBS Hierarchy and Calendars, or trace any milestone/activity backward to project start.
          </p>
        </div>

        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setActiveMode('longest')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeMode === 'longest'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Route className="w-3.5 h-3.5 text-rose-500" />
            Longest &amp; Subsequent Paths ({chains.length})
          </button>
          <button
            onClick={() => setActiveMode('backward')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeMode === 'backward'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
            Backward Path Tracer
          </button>
        </div>
      </div>

      {/* SECTION A: LONGEST & SUBSEQUENT PATHS */}
      {activeMode === 'longest' && (
        <div className="space-y-4">
          {/* Path Rank Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {chains.map((chain) => {
              const isSelected = selectedChain?.rank === chain.rank;
              const isValid = chain.validationStatus === 'Validated Continuous';
              return (
                <button
                  key={chain.rank}
                  onClick={() => setSelectedChainRank(chain.rank)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 ring-1 ring-amber-400/50 shadow-sm'
                      : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        chain.isPrimary
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}
                    >
                      {chain.isPrimary ? 'Primary #1' : `Subsequent #${chain.rank}`}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                        isValid
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {isValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {chain.validationStatus}
                    </span>
                  </div>

                  <div className="mt-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                    Total Float: {chain.totalFloatDays}d · {chain.activityIds.length} activities
                  </div>

                  <div className="mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {chain.startDate || '?'} &rarr; {chain.finishDate || '?'} ({chain.spanDays} cal. d)
                  </div>

                  {chain.mergesIntoActivityCode && (
                    <div className="mt-1 text-[10.5px] text-indigo-700 dark:text-indigo-400 font-medium">
                      Merges into Path #{chain.mergesIntoPathRank} via {chain.mergesIntoActivityCode}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Chain Details & Chronological Table */}
          {selectedChain && (
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {selectedChain.name}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Gap vs Primary: +{selectedChain.floatGapFromPrimaryDays}d
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    {selectedChain.validationNotes.map((note, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1">
                        • {note}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Chronological Sort Toggle */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                    {(
                      [
                        { id: 'start', label: 'Start Date ↑' },
                        { id: 'finish', label: 'Finish Date ↑' },
                        { id: 'float', label: 'Total Float ↑' },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setPathSortMode(s.id)}
                        className={`px-2.5 py-1 rounded font-medium transition-colors ${
                          pathSortMode === s.id
                            ? 'bg-amber-500 text-slate-950 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleExportPathCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Path CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[520px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Activity ID</th>
                      <th className="py-2.5 px-3 min-w-[230px]">Activity Name</th>
                      <th className="py-2.5 px-3 min-w-[220px]">WBS Hierarchy</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Assigned Calendar</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Start</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Finish</th>
                      <th className="py-2.5 px-2 text-right whitespace-nowrap">Dur</th>
                      <th className="py-2.5 px-2 text-right whitespace-nowrap">Float</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">Backward</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {selectedChainActivities.map((act, idx) => (
                      <tr
                        key={act.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          <button
                            onClick={() => onSelectActivity(act)}
                            className="hover:underline inline-flex items-center gap-1"
                          >
                            {act.code}
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {act.name}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                          <div className="flex items-start gap-1">
                            <Layers className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                            <span>{act.wbsPath}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-[11px] text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{act.calendarName || 'Default'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {act.startDate || '-'}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {act.finishDate || '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                          {act.origDurationDays}d
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-mono text-[11px] font-bold tabular-nums ${
                            act.totalFloatDays < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : act.totalFloatDays === 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {act.totalFloatDays}d
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedTargetId(act.id);
                              setActiveMode('backward');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10.5px] font-semibold"
                          >
                            <GitBranch className="w-3 h-3" /> Trace
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION B: INTERACTIVE BACKWARD PATH TRACER */}
      {activeMode === 'backward' && (
        <div className="space-y-4">
          {/* Target Selector Panel */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
                  Search &amp; Select Target Milestone or Activity to Trace Backward
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter activities/milestones by ID, Name, WBS..."
                    value={targetSearch}
                    onChange={(e) => setTargetSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {matchingTargets.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name} ({a.finishDate || '-'} | TF: {a.totalFloatDays}d)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
                  Quick-Pick Milestones &amp; Terminal Events
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPickTargets.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedTargetId(m.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        selectedTargetId === m.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Flag className="w-3 h-3" />
                      <span className="font-mono font-bold">{m.code}</span>
                      <span className="truncate max-w-[130px]">{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {backwardTrace && (
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              {/* Trace Summary Toolbar */}
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                    <span>Backward Trace Target:</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-mono">
                      {backwardTrace.target.code}
                    </span>
                    <span>{backwardTrace.target.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <span>
                      Driving Chain Length: <strong>{backwardTrace.drivingChain.length}</strong> activities
                    </span>
                    <span>·</span>
                    <span>
                      Total Upstream Predecessors: <strong>{backwardTrace.totalUpstreamCount}</strong>
                    </span>
                    <span>·</span>
                    <span className={backwardTrace.openStartNodes.length > 1 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                      Open Starts Upstream: <strong>{backwardTrace.openStartNodes.length}</strong>
                    </span>
                    <span>·</span>
                    <span className={backwardTrace.constrainedNodes.length > 0 ? 'text-purple-600 dark:text-purple-400 font-semibold' : ''}>
                      Constrained Activities: <strong>{backwardTrace.constrainedNodes.length}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center p-0.5 bg-slate-200/70 dark:bg-slate-900 border border-slate-300/70 dark:border-slate-800 rounded-lg text-xs">
                    <button
                      onClick={() => setShowFullUpstreamNetwork(false)}
                      className={`px-2.5 py-1 rounded font-medium ${
                        !showFullUpstreamNetwork
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Primary Driving Chain ({backwardTrace.drivingChain.length})
                    </button>
                    <button
                      onClick={() => setShowFullUpstreamNetwork(true)}
                      className={`px-2.5 py-1 rounded font-medium ${
                        showFullUpstreamNetwork
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Full Upstream Network ({backwardTrace.allUpstreamNodes.length})
                    </button>
                  </div>

                  <button
                    onClick={handleExportBackwardCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Trace CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[520px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3 whitespace-nowrap">Hop</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Activity ID</th>
                      <th className="py-2.5 px-3 min-w-[220px]">Activity Name &amp; WBS Hierarchy</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Calendar</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Start</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Finish</th>
                      <th className="py-2.5 px-2 text-right whitespace-nowrap">Float</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Logic Link &rarr; Next</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {(showFullUpstreamNetwork ? backwardTrace.allUpstreamNodes : backwardTrace.drivingChain).map((node, i) => {
                      const act = node.activity;
                      const isTarget = act.id === backwardTrace.target.id;
                      return (
                        <tr
                          key={`${act.id}_${i}`}
                          className={`transition-colors ${
                            isTarget
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                              : node.isOnDrivingChain
                              ? 'bg-rose-50/30 dark:bg-rose-950/15 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap align-top">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                              {isTarget ? 'Target (0)' : `-${node.hop}`}
                            </span>
                            {node.isOnDrivingChain && !isTarget && (
                              <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[9.5px] font-sans font-bold">
                                Driving
                              </span>
                            )}
                          </td>

                          <td className="py-2 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap align-top">
                            <button
                              onClick={() => onSelectActivity(act)}
                              className="hover:underline inline-flex items-center gap-1"
                            >
                              {act.code}
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </button>
                          </td>

                          <td className="py-2 px-3 align-top">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{act.name}</div>
                            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {act.wbsPath}
                            </div>
                          </td>

                          <td className="py-2 px-3 whitespace-nowrap text-[11px] text-slate-700 dark:text-slate-300 align-top">
                            {act.calendarName || 'Default'}
                          </td>

                          <td className="py-2 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap align-top">
                            {act.startDate || '-'}
                          </td>

                          <td className="py-2 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap align-top">
                            {act.finishDate || '-'}
                          </td>

                          <td
                            className={`py-2 px-2 text-right font-mono text-[11px] font-bold whitespace-nowrap align-top tabular-nums ${
                              act.totalFloatDays < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : act.totalFloatDays === 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {act.totalFloatDays}d
                          </td>

                          <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap align-top">
                            {node.linkToSuccessorCode ? (
                              <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                                  {node.linkToSuccessorType?.replace('PR_', '')}
                                  {node.linkToSuccessorLagDays ? ` +${node.linkToSuccessorLagDays}d` : ''}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="text-indigo-700 dark:text-indigo-400 font-semibold">
                                  {node.linkToSuccessorCode}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Selected Target</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
