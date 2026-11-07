import React, { useState } from 'react';
import { Activity, ParsedProject, WbsNode } from '../types/xer';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface WbsHierarchyProps {
  project: ParsedProject;
  onSelectActivity: (activity: Activity) => void;
}

export const WbsHierarchy: React.FC<WbsHierarchyProps> = ({
  project,
  onSelectActivity,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Default expand first level nodes
    const initial = new Set<string>();
    project.wbsHierarchy.forEach((root) => {
      initial.add(root.id);
      root.children.forEach((c) => initial.add(c.id));
    });
    return initial;
  });

  const [selectedWbsId, setSelectedWbsId] = useState<string | null>(
    project.wbsHierarchy.length > 0 ? project.wbsHierarchy[0].id : null
  );

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Expand all / collapse all
  const handleExpandAll = () => {
    const all = new Set<string>();
    project.wbsMap.forEach((_, id) => all.add(id));
    setExpandedNodes(all);
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Collect activities belonging to the selected WBS node and its descendants
  const selectedWbsNode = selectedWbsId ? project.wbsMap.get(selectedWbsId) : null;

  const getSubtreeWbsIds = (node: WbsNode): string[] => {
    const ids = [node.id];
    for (const child of node.children) {
      ids.push(...getSubtreeWbsIds(child));
    }
    return ids;
  };

  const wbsActivities = selectedWbsNode
    ? (() => {
        const targetWbsIds = new Set(getSubtreeWbsIds(selectedWbsNode));
        return project.activities.filter((a) => targetWbsIds.has(a.wbsId));
      })()
    : [];

  const renderWbsTreeItem = (node: WbsNode) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedWbsId === node.id;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => setSelectedWbsId(node.id)}
          style={{ paddingLeft: `${node.level * 18 + 10}px` }}
          className={`flex items-center justify-between py-2 pr-3 cursor-pointer transition-colors text-xs border-l-2 ${
            isSelected
              ? 'bg-amber-100 border-amber-500 text-amber-950 dark:bg-amber-500/15 dark:border-amber-400 dark:text-amber-200'
              : 'border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/50 dark:hover:text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-4.5" />
            )}

            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-amber-500/70 shrink-0" />
            )}

            <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold">{node.code}</span>
            <span className="truncate font-sans font-medium text-slate-800 dark:text-slate-200">{node.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {node.criticalCount > 0 && (
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5 font-bold" title="Critical activities">
                <ShieldAlert className="w-3 h-3" />
                {node.criticalCount}
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
              {node.activityCount} acts
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>{node.children.map((child) => renderWbsTreeItem(child))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg transition-colors">
      {/* Top Controls Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <h2 className="font-bold text-slate-900 dark:text-slate-100">Work Breakdown Structure (WBS) Hierarchy</h2>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-slate-500 dark:text-slate-400 font-mono">
            {project.wbsMap.size} WBS Elements
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Main Split Body: Left Tree, Right Node Details & Activities */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Tree Explorer */}
        <div className="w-[360px] lg:w-[420px] shrink-0 border-r border-slate-200 dark:border-slate-800 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/80 py-2">
          {project.wbsHierarchy.map((rootNode) => renderWbsTreeItem(rootNode))}
        </div>

        {/* Right Content Pane: Selected WBS Summary & Activities List */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 p-6 space-y-6">
          {selectedWbsNode ? (
            <>
              {/* Selected WBS Rollup Card */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-semibold">
                        {selectedWbsNode.code}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Level {selectedWbsNode.level}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{selectedWbsNode.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">{selectedWbsNode.fullPath}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Average Progress</span>
                    <span className="text-2xl font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {selectedWbsNode.avgProgressPct}%
                    </span>
                  </div>
                </div>

                {/* Roll-up Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <div className="p-2.5 bg-white dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">Total Activities</span>
                    <span className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {selectedWbsNode.activityCount}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">Roll-up Start</span>
                    <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {selectedWbsNode.minStartDate || '—'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">Roll-up Finish</span>
                    <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {selectedWbsNode.maxFinishDate || '—'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400 text-xs block">Critical Tasks</span>
                    <span
                      className={`text-base font-mono font-bold tabular-nums ${
                        selectedWbsNode.criticalCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {selectedWbsNode.criticalCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-branch Activities List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-400">
                    Activities in this WBS branch ({wbsActivities.length})
                  </h4>
                  <span className="text-xs text-slate-500">
                    Click any activity to inspect complete details
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40">
                  {wbsActivities.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No activities assigned under this WBS branch.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Activity ID</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Duration</th>
                          <th className="py-2.5 px-3 text-right">% Complete</th>
                          <th className="py-2.5 px-3">Start Date</th>
                          <th className="py-2.5 px-3">Finish Date</th>
                          <th className="py-2.5 px-3 text-right">Float</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                        {wbsActivities.map((act) => (
                          <tr
                            key={act.id}
                            onClick={() => onSelectActivity(act)}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-3 text-amber-700 dark:text-amber-400 font-semibold whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {act.isCritical && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500" title="Critical Path" />
                                )}
                                <span>{act.code}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-sans text-slate-800 dark:text-slate-100 font-medium">
                              {act.name}
                            </td>
                            <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                              {act.status === 'TK_Complete' ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Complete</span>
                              ) : act.status === 'TK_Active' ? (
                                <span className="text-blue-700 dark:text-sky-400 font-semibold">In Progress</span>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400">Not Started</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                              {act.origDurationDays}d
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 tabular-nums font-bold">
                              {act.physCompletePct}%
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                              {act.startDate || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                              {act.finishDate || '—'}
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right tabular-nums font-semibold ${
                                act.totalFloatDays <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {act.totalFloatDays}d
                            </td>
                            <td className="py-2.5 px-3 text-right text-blue-600 dark:text-sky-400 font-medium hover:underline">
                              Inspect &rarr;
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500">
              Select a WBS element on the left to view rollups and branch activities.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
