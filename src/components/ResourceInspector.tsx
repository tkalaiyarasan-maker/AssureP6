import React, { useState } from 'react';
import { Activity, ParsedProject, Resource } from '../types/xer';
import {
  Users,
  Search,
  DollarSign,
  Briefcase,
  Layers,
  ArrowRight,
  HardHat,
} from 'lucide-react';

interface ResourceInspectorProps {
  project: ParsedProject;
  onSelectActivity: (activity: Activity) => void;
}

export const ResourceInspector: React.FC<ResourceInspectorProps> = ({
  project,
  onSelectActivity,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    project.resources.length > 0 ? project.resources[0].id : null
  );

  const filteredResources = project.resources.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
  });

  const selectedResource = selectedResourceId
    ? project.resources.find((r) => r.id === selectedResourceId)
    : null;

  // Activities assigned to this resource
  const assignedActivities = selectedResource
    ? project.activities
        .filter((act) => act.assignments.some((a) => a.resourceId === selectedResource.id))
        .map((act) => {
          const assignment = act.assignments.find((a) => a.resourceId === selectedResource.id)!;
          return {
            activity: act,
            assignment,
          };
        })
    : [];

  // Totals
  const totalBudgetCost = project.resources.reduce((sum, r) => sum + r.totalCost, 0);
  const totalLaborHours = project.resources
    .filter((r) => r.type === 'RT_Labor')
    .reduce((sum, r) => sum + r.totalAssignedUnits, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <HardHat className="w-4 h-4 text-amber-400" />
          <h2 className="font-bold text-slate-100">Project Resources &amp; Cost Allocation</h2>
          <span className="text-slate-400">·</span>
          <span className="text-slate-400 font-mono">{project.resources.length} Defined Resources</span>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Total Labor:</span>
            <span className="text-slate-100 font-semibold tabular-nums">
              {totalLaborHours.toLocaleString()} hrs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Total Budgeted Cost:</span>
            <span className="text-emerald-400 font-semibold tabular-nums">
              ${totalBudgetCost.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Body: Left Resource Table, Right Assignments */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Resource List */}
        <div className="w-[380px] lg:w-[440px] shrink-0 border-r border-slate-800 flex flex-col bg-slate-950">
          <div className="p-3 border-b border-slate-800 bg-slate-900/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Resource Code or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 select-none">
            {filteredResources.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-sans">
                No resources match your search.
              </div>
            ) : (
              filteredResources.map((res) => {
                const isSelected = selectedResourceId === res.id;
                return (
                  <div
                    key={res.id}
                    onClick={() => setSelectedResourceId(res.id)}
                    className={`p-3 cursor-pointer transition-colors text-xs flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-l-2 border-amber-400 text-amber-200'
                        : 'border-l-2 border-transparent text-slate-300 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="space-y-0.5 truncate max-w-[240px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-amber-400">{res.code}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {res.type === 'RT_Labor' ? 'Labor' : res.type === 'RT_Mat' ? 'Material' : 'Equipment'}
                        </span>
                      </div>
                      <p className="text-slate-100 font-medium truncate">{res.name}</p>
                    </div>

                    <div className="text-right font-mono text-[11px] shrink-0">
                      <span className="text-slate-200 block font-semibold tabular-nums">
                        {res.totalAssignedUnits.toLocaleString()} {res.unit}
                      </span>
                      <span className="text-emerald-400 tabular-nums">
                        ${res.totalCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-6">
          {selectedResource ? (
            <>
              {/* Resource Summary Header */}
              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                        {selectedResource.code}
                      </span>
                      <span className="text-xs text-slate-400">
                        Type:{' '}
                        {selectedResource.type === 'RT_Labor'
                          ? 'Labor Resource'
                          : selectedResource.type === 'RT_Mat'
                          ? 'Material Resource'
                          : 'Non-Labor / Equipment'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">{selectedResource.name}</h3>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Budgeted Cost</span>
                    <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                      ${selectedResource.totalCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 text-xs block">Assigned Activities</span>
                    <span className="text-base font-mono font-bold text-slate-100 tabular-nums">
                      {assignedActivities.length}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 text-xs block">Total Planned Units</span>
                    <span className="text-base font-mono font-bold text-slate-100 tabular-nums">
                      {selectedResource.totalAssignedUnits.toLocaleString()} {selectedResource.unit}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                    <span className="text-slate-400 text-xs block">Unit of Measure</span>
                    <span className="text-base font-mono font-bold text-slate-100 uppercase">
                      {selectedResource.unit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Activities List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Activities Assigned to {selectedResource.code} ({assignedActivities.length})
                  </h4>
                  <span className="text-xs text-slate-500">Click to inspect activity</span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                  {assignedActivities.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No activities currently have this resource assigned.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Activity ID</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Target Units</th>
                          <th className="py-2.5 px-3 text-right">Target Cost</th>
                          <th className="py-2.5 px-3">Start Date</th>
                          <th className="py-2.5 px-3">Finish Date</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {assignedActivities.map(({ activity: act, assignment }) => (
                          <tr
                            key={act.id}
                            onClick={() => onSelectActivity(act)}
                            className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-3 text-amber-400 font-semibold whitespace-nowrap">
                              {act.code}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-slate-100 font-medium">
                              {act.name}
                            </td>
                            <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                              {act.status === 'TK_Complete' ? (
                                <span className="text-emerald-400">Complete</span>
                              ) : act.status === 'TK_Active' ? (
                                <span className="text-sky-400">In Progress</span>
                              ) : (
                                <span className="text-slate-400">Not Started</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-200 tabular-nums">
                              {assignment.targetUnits.toLocaleString()} {selectedResource.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-400 tabular-nums font-semibold">
                              ${assignment.targetCost.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 tabular-nums whitespace-nowrap">
                              {act.startDate || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 tabular-nums whitespace-nowrap">
                              {act.finishDate || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-sky-400 hover:underline">
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
              Select a resource on the left to view assigned tasks and cost breakdown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
