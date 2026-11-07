import React, { useState, useMemo } from 'react';
import { ParsedProject, XerRawTable } from '../types/xer';
import {
  Database,
  Table as TableIcon,
  Search,
  Code,
  Download,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import { exportProjectToXer } from '../utils/xerParser';

interface RawXerExplorerProps {
  project: ParsedProject;
}

export const RawXerExplorer: React.FC<RawXerExplorerProps> = ({ project }) => {
  const tableNames = useMemo(() => Array.from(project.rawTables.keys()), [project.rawTables]);
  const [selectedTableName, setSelectedTableName] = useState<string>(
    tableNames.includes('TASK') ? 'TASK' : tableNames[0] || ''
  );
  const [viewMode, setViewMode] = useState<'table' | 'rawText'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const selectedTable: XerRawTable | undefined = project.rawTables.get(selectedTableName);

  // Filter records
  const filteredRecords = useMemo(() => {
    if (!selectedTable) return [];
    if (!searchQuery.trim()) return selectedTable.records;
    const q = searchQuery.toLowerCase();
    return selectedTable.records.filter((rec) => {
      return Object.values(rec).some((val) => (val || '').toLowerCase().includes(q));
    });
  }, [selectedTable, searchQuery]);

  // Copy raw XER
  const handleCopyRaw = () => {
    const raw = exportProjectToXer(project);
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download raw XER
  const handleDownloadXer = () => {
    const raw = exportProjectToXer(project);
    const blob = new Blob([raw], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.metadata.code || 'export'}.xer`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg transition-colors">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <Database className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <h2 className="font-bold text-slate-900 dark:text-slate-100">Primavera P6 Raw XER Tables &amp; Schema</h2>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-slate-500 dark:text-slate-400 font-mono">
            {project.rawTables.size} Tables Parsed
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-slate-200/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm font-semibold dark:bg-slate-800 dark:text-slate-100' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table Explorer
            </button>
            <button
              onClick={() => setViewMode('rawText')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'rawText' ? 'bg-white text-slate-900 shadow-sm font-semibold dark:bg-slate-800 dark:text-slate-100' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Raw .XER Text
            </button>
          </div>

          {/* Download Raw .XER */}
          <button
            onClick={handleDownloadXer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Download .XER File
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        /* Split view: Left table selector, Right table data */
        <div className="flex flex-1 overflow-hidden">
          {/* Table List Sidebar */}
          <div className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 overflow-y-auto bg-slate-50/50 dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-800/40 select-none">
            <div className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60">
              Database Tables (%T)
            </div>
            {tableNames.map((tName) => {
              const tbl = project.rawTables.get(tName);
              const isSelected = selectedTableName === tName;
              return (
                <div
                  key={tName}
                  onClick={() => setSelectedTableName(tName)}
                  className={`p-3 cursor-pointer transition-colors text-xs flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-100 border-l-2 border-amber-500 text-amber-950 dark:bg-amber-500/15 dark:border-amber-400 dark:text-amber-200 font-semibold'
                      : 'border-l-2 border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <span className="font-mono">{tName}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 font-mono">
                    {tbl?.records.length || 0}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Table Grid Pane */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950">
            {/* Search Bar for Table */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono text-amber-700 dark:text-amber-400 font-bold text-sm">
                  %T {selectedTableName}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-mono">
                  {selectedTable?.fields.length || 0} fields (%F) · {filteredRecords.length} records (%R)
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-56 text-xs"
                />
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto">
              {selectedTable && selectedTable.fields.length > 0 ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-900 text-slate-500 w-12 text-center">#</th>
                      {selectedTable.fields.map((f) => (
                        <th key={f} className="py-2.5 px-3 whitespace-nowrap bg-slate-100 dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-300">
                          {f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-mono text-[11px]">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={selectedTable.fields.length + 1}
                          className="py-12 text-center text-slate-500 font-sans"
                        >
                          No records found in table %T {selectedTableName}.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((rec, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                          <td className="py-2 px-3 text-slate-400 dark:text-slate-600 text-center">{rIdx + 1}</td>
                          {selectedTable.fields.map((f) => (
                            <td key={f} className="py-2 px-3 text-slate-800 dark:text-slate-300 whitespace-nowrap max-w-xs truncate">
                              {rec[f] !== undefined && rec[f] !== '' ? rec[f] : <span className="text-slate-400 dark:text-slate-700 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-slate-500">No fields defined for this table.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Raw XER Text View */
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-mono">
              Raw Oracle Primavera P6 Export Format (.xer)
            </span>
            <button
              onClick={handleCopyRaw}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Raw Text'}
            </button>
          </div>

          <pre className="flex-1 overflow-auto p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-300 mt-3 border border-slate-200 dark:border-slate-800 leading-relaxed whitespace-pre select-text">
            {exportProjectToXer(project)}
          </pre>
        </div>
      )}
    </div>
  );
};
