import React, { useState, useMemo, useEffect } from 'react';
import { P6HealthCheckDashboardData } from '../../types/healthCheck';
import {
  Search,
  ShieldAlert,
  Download,
  ArrowUpRight,
} from 'lucide-react';
import { DashboardNavigationRequest } from './ExecutiveScoreCards';

export type FilterTab = 'all' | 'critical' | 'deficiencies' | 'criteriaA' | 'criteriaB';

interface DetailedScoringTableProps {
  data: P6HealthCheckDashboardData;
  initialFilter?: FilterTab;
  initialTheme?: string;
  highlightParamId?: string | null;
  onNavigate?: (req: DashboardNavigationRequest) => void;
}

export const DetailedScoringTable: React.FC<DetailedScoringTableProps> = ({
  data,
  initialFilter = 'all',
  initialTheme = 'all',
  highlightParamId = null,
  onNavigate,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>(initialFilter);
  const [selectedTheme, setSelectedTheme] = useState<string>(initialTheme);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActiveFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    setSelectedTheme(initialTheme);
  }, [initialTheme]);

  useEffect(() => {
    if (highlightParamId) {
      setSearchQuery(highlightParamId);
    }
  }, [highlightParamId]);

  const uniqueThemes = useMemo(
    () => Array.from(new Set(data.parameters.map((p) => p.theme))),
    [data.parameters]
  );

  const filteredParameters = useMemo(() => {
    return data.parameters.filter((p) => {
      if (activeFilter === 'critical' && !p.criticalKey) return false;
      if (activeFilter === 'deficiencies' && p.unitsLost === 0 && p.status !== 'Pending') return false;
      if (activeFilter === 'criteriaA' && p.cat !== 'A') return false;
      if (activeFilter === 'criteriaB' && p.cat !== 'B') return false;

      if (selectedTheme !== 'all' && p.theme !== selectedTheme) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = p.id.toLowerCase().includes(q);
        const matchesName = p.parameter.toLowerCase().includes(q);
        const matchesTheme = p.theme.toLowerCase().includes(q);
        const matchesAction = p.action.toLowerCase().includes(q);
        const matchesDesc = (p.description || '').toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesTheme && !matchesAction && !matchesDesc) return false;
      }

      return true;
    });
  }, [data.parameters, activeFilter, selectedTheme, searchQuery]);

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Category',
      'Theme',
      'Parameter',
      'Description / Definition',
      'Critical Key',
      'Weight Factor',
      'Budget Units',
      'Actual Setting / Count',
      'Expected Setting / Base',
      'Result',
      'Target (Pass)',
      'Limit (Fail)',
      'Status',
      'Score %',
      'Units Earned',
      'Units Lost',
      'Action',
      'Where to check in P6',
    ];

    const rows = filteredParameters.map((p) => [
      `"${p.id}"`,
      `"${p.cat}"`,
      `"${p.theme}"`,
      `"${p.parameter.replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      p.criticalKey ? 'Yes' : 'No',
      p.weightFactor,
      p.budgetUnits,
      `"${String(p.actualSettingOrCount).replace(/"/g, '""')}"`,
      `"${String(p.expectedSettingOrBase).replace(/"/g, '""')}"`,
      `"${p.resultStr}"`,
      `"${p.targetStr}"`,
      `"${p.limitStr}"`,
      p.status,
      `${p.scorePct}%`,
      p.unitsEarned,
      p.unitsLost,
      `"${p.action}"`,
      `"${(p.whereToCheck || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.projectDetails.projectName}_HealthCheck_54Parameters.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col transition-colors">
      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Tabs */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              All 54 Checks
            </button>
            <button
              onClick={() => setActiveFilter('critical')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                activeFilter === 'critical'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-rose-500" />
              Critical-Key (20)
            </button>
            <button
              onClick={() => setActiveFilter('deficiencies')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeFilter === 'deficiencies'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Deficiencies ({data.rankedDeficiencies.length})
            </button>
            <button
              onClick={() => setActiveFilter('criteriaA')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeFilter === 'criteriaA'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              P6 Settings (15)
            </button>
            <button
              onClick={() => setActiveFilter('criteriaB')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeFilter === 'criteriaB'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Schedule Integrity (39)
            </button>
          </div>

          {/* Theme Filter */}
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Themes</option>
            {uniqueThemes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search check ID, parameter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-52 text-xs"
            />
          </div>
        </div>

        {/* CSV Export */}
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Export 54 Parameters CSV
        </button>
      </div>

      {/* 54-Parameter Table */}
      <div className="overflow-x-auto max-h-[560px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10.5px]">
            <tr>
              <th className="py-2.5 px-3 whitespace-nowrap">ID</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Theme</th>
              <th className="py-2.5 px-3 min-w-[270px]">Parameter &amp; Interpretation</th>
              <th className="py-2.5 px-2 text-center whitespace-nowrap">Critical Key</th>
              <th className="py-2.5 px-2 text-right whitespace-nowrap">Budget</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Actual Setting / Count</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Expected / Base</th>
              <th className="py-2.5 px-2 text-center whitespace-nowrap">Target</th>
              <th className="py-2.5 px-2 text-center whitespace-nowrap">Limit</th>
              <th className="py-2.5 px-2 text-center whitespace-nowrap">Status</th>
              <th className="py-2.5 px-2 text-right whitespace-nowrap">Earned</th>
              <th className="py-2.5 px-2 text-right whitespace-nowrap">Lost</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Action</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Navigate</th>
              <th className="py-2.5 px-3 min-w-[200px]">Where to Check in P6</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
            {filteredParameters.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-8 text-center text-slate-500 font-sans">
                  No parameters found matching filters.
                </td>
              </tr>
            ) : (
              filteredParameters.map((p) => {
                const statusBadge =
                  p.status === 'Pass'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-950/60 dark:border-emerald-800'
                    : p.status === 'Warning'
                    ? 'text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-400 dark:bg-amber-950/60 dark:border-amber-800'
                    : p.status === 'Fail'
                    ? 'text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-400 dark:bg-rose-950/60 dark:border-rose-800'
                    : 'text-slate-600 bg-slate-100 border-slate-300 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700';

                const isHighlighted = highlightParamId === p.id;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      isHighlighted
                        ? 'bg-amber-50 dark:bg-amber-950/30 ring-1 ring-inset ring-amber-400/50'
                        : p.unitsLost > 0
                        ? 'bg-rose-50/50 dark:bg-rose-950/10'
                        : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap align-top">
                      {p.id}
                    </td>

                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-sans text-[11px] align-top">
                      {p.theme.replace('A: ', '')}
                    </td>

                    <td className="py-2 px-3 font-sans align-top">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{p.parameter}</div>
                      {p.description && (
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          {p.description}
                        </div>
                      )}
                    </td>

                    <td className="py-2 px-2 text-center whitespace-nowrap align-top">
                      {p.criticalKey ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 font-bold text-[10px]">
                          Yes (2.0x)
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[10px]">No (1.0x)</span>
                      )}
                    </td>

                    <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300 tabular-nums align-top">
                      {p.budgetUnits.toFixed(2)}
                    </td>

                    <td className="py-2 px-3 text-slate-900 dark:text-slate-100 tabular-nums font-semibold whitespace-nowrap align-top">
                      {String(p.actualSettingOrCount)}
                    </td>

                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap truncate max-w-[140px] align-top" title={String(p.expectedSettingOrBase)}>
                      {String(p.expectedSettingOrBase)}
                    </td>

                    <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap align-top">
                      {p.targetStr}
                    </td>

                    <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap align-top">
                      {p.limitStr}
                    </td>

                    <td className="py-2 px-2 text-center whitespace-nowrap align-top">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusBadge}`}>
                        {p.status}
                      </span>
                    </td>

                    <td className="py-2 px-2 text-right text-emerald-700 dark:text-emerald-400 tabular-nums font-semibold align-top">
                      {p.unitsEarned.toFixed(2)}
                    </td>

                    <td
                      className={`py-2 px-2 text-right tabular-nums font-semibold align-top ${
                        p.unitsLost > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {p.unitsLost.toFixed(2)}
                    </td>

                    <td className="py-2 px-3 whitespace-nowrap font-sans align-top">
                      <span
                        className={`text-[10.5px] font-semibold ${
                          p.action === 'RECHECK & RESUBMIT'
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : p.action === 'Review & improve'
                            ? 'text-amber-600 dark:text-amber-400'
                            : p.action === 'Enter data'
                            ? 'text-blue-600 dark:text-sky-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {p.action}
                      </span>
                    </td>

                    <td className="py-2 px-3 whitespace-nowrap font-sans align-top">
                      {p.navigationTarget && onNavigate ? (
                        <button
                          onClick={() =>
                            onNavigate({
                              workspaceTab: p.navigationTarget?.workspaceTab,
                              dashboardSubTab: p.navigationTarget?.dashboardSubTab,
                              dcmaCheckId: p.navigationTarget?.dcmaCheckId,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10.5px] font-semibold transition-colors"
                        >
                          {p.navigationTarget.label || 'Open Section'}
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-sans text-[11px] truncate max-w-[260px] align-top" title={p.whereToCheck}>
                      {p.whereToCheck}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

