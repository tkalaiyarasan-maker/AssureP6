import React, { useState, useMemo } from 'react';
import { Activity, ParsedProject } from '../../types/xer';
import {
  DEFAULT_EMPLOYER_OBLIGATION_KEYWORDS,
  extractEmployerObligations,
  downloadCsvFile,
} from '../../utils/scheduleAnalysis';
import {
  Briefcase,
  Search,
  Download,
  GitBranch,
  Plus,
  X,
  RotateCcw,
  Calendar as CalendarIcon,
  ExternalLink,
} from 'lucide-react';

interface EmployerObligationsViewProps {
  project: ParsedProject;
  onSelectActivity: (act: Activity) => void;
  onTraceBackward: (act: Activity) => void;
}

export const EmployerObligationsView: React.FC<EmployerObligationsViewProps> = ({
  project,
  onSelectActivity,
  onTraceBackward,
}) => {
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_EMPLOYER_OBLIGATION_KEYWORDS);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showKeywordEditor, setShowKeywordEditor] = useState(false);

  const obligations = useMemo(
    () => extractEmployerObligations(project, keywords),
    [project, keywords]
  );

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of obligations) {
      counts.set(row.obligationCategory, (counts.get(row.obligationCategory) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [obligations]);

  const filtered = useMemo(() => {
    return obligations.filter((row) => {
      if (selectedCategory !== 'all' && row.obligationCategory !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const act = row.activity;
        const ok =
          act.code.toLowerCase().includes(q) ||
          act.name.toLowerCase().includes(q) ||
          act.wbsPath.toLowerCase().includes(q) ||
          (act.calendarName || '').toLowerCase().includes(q) ||
          row.obligationCategory.toLowerCase().includes(q) ||
          row.matchedKeywords.some((k) => k.includes(q));
        if (!ok) return false;
      }
      return true;
    });
  }, [obligations, selectedCategory, searchQuery]);

  const criticalCount = useMemo(
    () => filtered.filter((r) => r.activity.isCritical || r.activity.isLongestPath).length,
    [filtered]
  );
  const completedCount = useMemo(
    () => filtered.filter((r) => r.activity.status === 'TK_Complete').length,
    [filtered]
  );
  const pendingCount = filtered.length - completedCount;

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newKeyword.trim().toLowerCase();
    if (!cleaned || keywords.includes(cleaned)) {
      setNewKeyword('');
      return;
    }
    setKeywords((prev) => [...prev, cleaned]);
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const handleExportCsv = () => {
    const headers = [
      'Activity ID',
      'Obligation Activity Name',
      'Obligation Category',
      'Matched Contract Terms',
      'WBS Hierarchy',
      'Assigned Calendar',
      'Planned / Baseline Start',
      'Planned / Baseline Finish',
      'Start Date',
      'Finish Date',
      'Duration (d)',
      'Total Float (d)',
      'Downstream Successors',
      'Status',
    ];

    const rows = filtered.map((r) => [
      r.activity.code,
      r.activity.name,
      r.obligationCategory,
      r.matchedKeywords.join('; '),
      r.activity.wbsPath,
      r.activity.calendarName || 'Default',
      r.activity.targetStartDate || '-',
      r.activity.targetFinishDate || '-',
      r.activity.startDate || '-',
      r.activity.finishDate || '-',
      r.activity.origDurationDays,
      r.activity.totalFloatDays,
      r.activity.successors.length,
      r.activity.status === 'TK_Complete' ? 'Completed' : r.activity.status === 'TK_Active' ? 'In Progress' : 'Not Started',
    ]);

    downloadCsvFile(
      `${project.metadata.code || 'project'}_Employer_Obligations_Report.csv`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-sky-500" />
            Employer / Client Obligations Register
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Segregates Employer-side deliverables stipulated in the Contract Agreement (ROW, Site Access, Statutory NOCs, Drawing Approvals, Utilities, Free-Issue Materials) to track interface exposure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeywordEditor((v) => !v)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
          >
            {showKeywordEditor ? 'Hide Contract Keywords' : `Customize Keywords (${keywords.length})`}
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Obligations CSV ({filtered.length})
          </button>
        </div>
      </div>

      {/* Optional Editable Keyword Classifier */}
      {showKeywordEditor && (
        <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Contractual Employer-Obligation Matching Keywords (matches Activity Name, ID, WBS Path &amp; Calendar)
            </span>
            <button
              onClick={() => setKeywords(DEFAULT_EMPLOYER_OBLIGATION_KEYWORDS)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              <RotateCcw className="w-3 h-3" /> Reset Defaults
            </button>
          </div>

          <form onSubmit={handleAddKeyword} className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              placeholder="Add contract keyword (e.g. 'handover', 'permit', 'owner')..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300"
              >
                {kw}
                <button
                  onClick={() => handleRemoveKeyword(kw)}
                  className="text-slate-400 hover:text-rose-500"
                  title={`Remove "${kw}"`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Identified Employer Obligations
          </span>
          <span className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1 block">
            {filtered.length}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {project.activities.length > 0 ? ((filtered.length / project.activities.length) * 100).toFixed(1) : '0.0'}% of total schedule
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Critical / Driving Obligations
          </span>
          <span className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-1 block">
            {criticalCount}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Zero/negative float interface items
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Completed Obligations
          </span>
          <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1 block">
            {completedCount}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Discharged by Employer
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Open / Pending Obligations
          </span>
          <span className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1 block">
            {pendingCount}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Requires monitoring &amp; tracking
          </span>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Categories ({obligations.length})
            </button>
            {categories.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat} ({count})
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search obligation ID, name, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 w-60 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[540px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Activity ID</th>
                <th className="py-2.5 px-3 min-w-[240px]">Employer Obligation Activity &amp; WBS</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Obligation Category</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Calendar</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Start</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Finish</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Dur (d)</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Float (d)</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Succ.</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    No Employer obligation activities matched your filter or keywords. Use "Customize Keywords" above to add contract-specific terms.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const act = row.activity;
                  return (
                    <tr
                      key={act.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap align-top">
                        <button
                          onClick={() => onSelectActivity(act)}
                          className="hover:underline flex items-center gap-1"
                        >
                          {act.code}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>
                        {act.isCritical && (
                          <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[9.5px] font-sans font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            Critical
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 align-top">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{act.name}</div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                          {act.wbsPath}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {row.matchedKeywords.map((kw) => (
                            <span
                              key={kw}
                              className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 font-mono text-[9.5px]"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10.5px] font-medium">
                          {row.obligationCategory}
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

                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap align-top">
                        {act.startDate || '-'}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap align-top">
                        {act.finishDate || '-'}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap align-top tabular-nums">
                        {act.origDurationDays}d
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

                      <td className="py-2.5 px-2 text-right font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap align-top tabular-nums">
                        {act.successors.length}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap align-top">
                        <button
                          onClick={() => onTraceBackward(act)}
                          title="Trace upstream dependencies driving this obligation"
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
