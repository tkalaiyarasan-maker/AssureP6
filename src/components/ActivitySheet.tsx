import React, { useState, useMemo } from 'react';
import { Activity, ParsedProject } from '../types/xer';
import {
  Search,
  Filter,
  Download,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Circle,
  FileSpreadsheet,
} from 'lucide-react';

interface ActivitySheetProps {
  project: ParsedProject;
  onSelectActivity: (activity: Activity) => void;
  selectedActivityId?: string;
}

type SortField =
  | 'code'
  | 'name'
  | 'status'
  | 'origDurationDays'
  | 'remainDurationDays'
  | 'physCompletePct'
  | 'startDate'
  | 'finishDate'
  | 'totalFloatDays';

export const ActivitySheet: React.FC<ActivitySheetProps> = ({
  project,
  onSelectActivity,
  selectedActivityId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'TK_NotStart' | 'TK_Active' | 'TK_Complete'>('all');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [milestonesOnly, setMilestonesOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortAsc, setSortAsc] = useState(true);

  // Filter and sort activities
  const filteredAndSortedActivities = useMemo(() => {
    return project.activities
      .filter((act) => {
        if (criticalOnly && !act.isCritical) return false;
        if (milestonesOnly && act.type !== 'TT_Mile' && act.type !== 'TT_FinMile' && act.origDurationDays !== 0) {
          return false;
        }
        if (statusFilter !== 'all' && act.status !== statusFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesCode = act.code.toLowerCase().includes(q);
          const matchesName = act.name.toLowerCase().includes(q);
          const matchesWbs = (act.wbsPath || act.wbsName).toLowerCase().includes(q);
          const matchesResource = act.assignments.some(
            (a) => a.resourceCode.toLowerCase().includes(q) || a.resourceName.toLowerCase().includes(q)
          );
          if (!matchesCode && !matchesName && !matchesWbs && !matchesResource) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [project.activities, searchQuery, statusFilter, criticalOnly, milestonesOnly, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Export visible rows to CSV
  const handleExportCsv = () => {
    const headers = [
      'Activity ID',
      'Activity Name',
      'Status',
      'WBS Path',
      'Orig Duration (Days)',
      'Remain Duration (Days)',
      'Physical % Complete',
      'Start Date',
      'Finish Date',
      'Total Float (Days)',
      'Critical',
      'Predecessors',
      'Successors',
      'Resources',
    ];

    const rows = filteredAndSortedActivities.map((act) => [
      `"${act.code}"`,
      `"${act.name.replace(/"/g, '""')}"`,
      act.status.replace('TK_', ''),
      `"${(act.wbsPath || act.wbsName).replace(/"/g, '""')}"`,
      act.origDurationDays,
      act.remainDurationDays,
      act.physCompletePct,
      act.startDate || '',
      act.finishDate || '',
      act.totalFloatDays,
      act.isCritical ? 'Yes' : 'No',
      `"${act.predecessors.map((p) => `${p.predTaskCode}(${p.type.replace('PR_', '')})`).join('; ')}"`,
      `"${act.successors.map((s) => `${s.predTaskCode}(${s.type.replace('PR_', '')})`).join('; ')}"`,
      `"${act.assignments.map((r) => r.resourceCode).join('; ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${project.metadata.code}_Activities.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg transition-colors">
      {/* Table Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, name, WBS, resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-64 text-xs"
            />
          </div>

          {/* Status Segmented Buttons */}
          <div className="flex items-center p-0.5 bg-slate-200/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              All ({project.activities.length})
            </button>
            <button
              onClick={() => setStatusFilter('TK_NotStart')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'TK_NotStart'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Not Started ({project.stats.notStartedCount})
            </button>
            <button
              onClick={() => setStatusFilter('TK_Active')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'TK_Active'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              In Progress ({project.stats.inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter('TK_Complete')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'TK_Complete'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Completed ({project.stats.completedCount})
            </button>
          </div>

          {/* Critical Path Toggle */}
          <button
            onClick={() => setCriticalOnly(!criticalOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              criticalOnly
                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 shadow-sm'
                : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            Critical Path ({project.stats.criticalCount})
          </button>

          {/* Milestones Toggle */}
          <button
            onClick={() => setMilestonesOnly(!milestonesOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              milestonesOnly
                ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 shadow-sm'
                : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Milestones ({project.stats.milestoneCount})
          </button>
        </div>

        {/* Export CSV Button */}
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium transition-colors whitespace-nowrap"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Export to CSV
        </button>
      </div>

      {/* High-Density Spreadsheet Table */}
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 select-none">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider text-[11px]">
            <tr>
              <th
                onClick={() => handleSort('code')}
                className="py-3 px-3 cursor-pointer hover:text-slate-100 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Activity ID</span>
                  {sortField === 'code' ? (
                    sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('name')}
                className="py-3 px-3 cursor-pointer hover:text-slate-100 min-w-[220px]"
              >
                <div className="flex items-center gap-1">
                  <span>Activity Name</span>
                  {sortField === 'name' ? (
                    sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('status')}
                className="py-3 px-3 cursor-pointer hover:text-slate-100 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  {sortField === 'status' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>

              <th className="py-3 px-3 text-slate-400 min-w-[140px]">WBS Node</th>

              <th
                onClick={() => handleSort('origDurationDays')}
                className="py-3 px-3 cursor-pointer hover:text-slate-100 text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Orig Dur</span>
                  {sortField === 'origDurationDays' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>

              <th
                onClick={() => handleSort('physCompletePct')}
                className="py-3 px-3 cursor-pointer hover:text-slate-100 text-right min-w-[90px]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>% Complete</span>
                  {sortField === 'physCompletePct' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>

              <th
                onClick={() => handleSort('startDate')}
                className="py-3 px-3 cursor-pointer hover:text-slate-100 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Start Date</span>
                  {sortField === 'startDate' ? (
                    sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('finishDate')}
                className="py-3 px-3 cursor-pointer hover:text-slate-100 whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Finish Date</span>
                  {sortField === 'finishDate' ? (
                    sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('totalFloatDays')}
                className="py-3 px-3 cursor-pointer hover:text-slate-100 text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Float</span>
                  {sortField === 'totalFloatDays' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>

              <th className="py-3 px-3 text-slate-400">Predecessors</th>
              <th className="py-3 px-3 text-slate-400">Successors</th>
              <th className="py-3 px-3 text-slate-400">Assigned Resources</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
            {filteredAndSortedActivities.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-500 font-sans">
                  No activities found matching criteria.
                </td>
              </tr>
            ) : (
              filteredAndSortedActivities.map((act) => {
                const isSelected = act.id === selectedActivityId;
                const isMilestone = act.type === 'TT_Mile' || act.type === 'TT_FinMile' || act.origDurationDays === 0;

                return (
                  <tr
                    key={act.id}
                    onClick={() => onSelectActivity(act)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {/* Activity Code */}
                    <td className="py-2.5 px-3 font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {act.isCritical && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Critical Path Task" />
                        )}
                        <span>{act.code}</span>
                      </div>
                    </td>

                    {/* Activity Name */}
                    <td className="py-2.5 px-3 font-sans text-xs">
                      <div className="flex items-center gap-2">
                        {isMilestone && (
                          <span className="w-2.5 h-2.5 rotate-45 bg-amber-500 shrink-0" title="Milestone" />
                        )}
                        <span className="truncate max-w-md font-medium text-slate-900 dark:text-slate-100">
                          {act.name}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                      {act.status === 'TK_Complete' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                        </span>
                      ) : act.status === 'TK_Active' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-sky-400 font-medium">
                          <Clock className="w-3.5 h-3.5" /> In Progress
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <Circle className="w-3.5 h-3.5" /> Not Started
                        </span>
                      )}
                    </td>

                    {/* WBS */}
                    <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400 truncate max-w-[160px] text-[11px]">
                      {act.wbsName}
                    </td>

                    {/* Orig Duration */}
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {act.origDurationDays}d
                    </td>

                    {/* % Complete */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                          {act.physCompletePct}%
                        </span>
                        <div className="w-10 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, act.physCompletePct)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Start Date */}
                    <td className="py-2.5 px-3 tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {act.startDate || '—'}
                    </td>

                    {/* Finish Date */}
                    <td className="py-2.5 px-3 tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {act.finishDate || '—'}
                    </td>

                    {/* Total Float */}
                    <td
                      className={`py-2.5 px-3 text-right tabular-nums whitespace-nowrap ${
                        act.totalFloatDays <= 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {act.totalFloatDays}d
                    </td>

                    {/* Predecessors */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[140px] text-[11px]">
                      {act.predecessors.length === 0 ? (
                        <span className="text-amber-700 dark:text-amber-500/80 font-medium">Open Start</span>
                      ) : (
                        act.predecessors.map((p) => p.predTaskCode || p.predTaskId).join(', ')
                      )}
                    </td>

                    {/* Successors */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[140px] text-[11px]">
                      {act.successors.length === 0 ? (
                        <span className="text-amber-700 dark:text-amber-500/80 font-medium">Open Finish</span>
                      ) : (
                        act.successors.map((s) => s.predTaskCode || s.taskId).join(', ')
                      )}
                    </td>

                    {/* Resources */}
                    <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400 truncate max-w-[160px] text-[11px]">
                      {act.assignments.length === 0 ? (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      ) : (
                        act.assignments.map((a) => a.resourceCode).join(', ')
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
        <span>
          Showing <span className="text-slate-900 dark:text-slate-200 font-mono font-semibold">{filteredAndSortedActivities.length}</span> of{' '}
          <span className="text-slate-900 dark:text-slate-200 font-mono font-semibold">{project.activities.length}</span> activities
        </span>
        <span className="text-slate-500">
          Tip: Click any row to view complete predecessors, successors, and resource assignments.
        </span>
      </div>
    </div>
  );
};
