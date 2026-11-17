import React from 'react';
import { P6HealthCheckDashboardData } from '../../types/healthCheck';
import { DashboardNavigationRequest } from './ExecutiveScoreCards';

interface ProjectMetaAndCountsProps {
  data: P6HealthCheckDashboardData;
  onNavigate?: (req: DashboardNavigationRequest) => void;
}

export const ProjectMetaAndCounts: React.FC<ProjectMetaAndCountsProps> = ({ data, onNavigate }) => {
  const { projectDetails, counts } = data;
  const showMustFinishBy =
    Boolean(projectDetails.mustFinishBy) &&
    projectDetails.mustFinishBy !== projectDetails.projectFinish;

  return (
    <div className="space-y-3">
      {/* 1. Project Details Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 p-3 bg-amber-50/80 dark:bg-slate-900/80 border border-amber-200/90 dark:border-slate-800 rounded-xl text-xs shadow-sm">
        {/* Project Name */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block tracking-wider">
            Project Name
          </span>
          <div className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-300 font-semibold truncate text-[11px]" title={projectDetails.projectName}>
            {projectDetails.projectName}
          </div>
        </div>

        {/* Schedule Type */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block tracking-wider">
            Schedule Type
          </span>
          <div className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-300 font-semibold text-center text-[11px]">
            {projectDetails.scheduleType}
          </div>
        </div>

        {/* Project Start */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block tracking-wider">
            Project Start
          </span>
          <div className="py-1 font-mono text-slate-800 dark:text-slate-200 text-xs font-semibold">
            {projectDetails.projectStart}
          </div>
        </div>

        {/* Scheduled Project Completion */}
        <div className="space-y-1" title={projectDetails.completionSourceNote || 'Calculated CPM Completion Date'}>
          <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block tracking-wider">
            Scheduled Finish
          </span>
          <div className="py-1 font-mono text-slate-900 dark:text-slate-100 text-xs font-bold">
            {projectDetails.scheduledFinish || projectDetails.projectFinish}
          </div>
          {showMustFinishBy ? (
            <span className="text-[9.5px] font-mono text-amber-700 dark:text-amber-400 block">
              Must Finish By: {projectDetails.mustFinishBy}
            </span>
          ) : projectDetails.completionSourceNote ? (
            <span className="text-[9.5px] text-slate-500 dark:text-slate-400 block truncate">
              {projectDetails.completionSourceNote}
            </span>
          ) : null}
        </div>

        {/* Data Date */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block tracking-wider">
            Data Date
          </span>
          <div className="py-1 font-mono text-slate-800 dark:text-slate-200 text-xs font-semibold">
            {projectDetails.dataDate}
          </div>
        </div>

        {/* Reviewer */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block tracking-wider">
            Reviewer
          </span>
          <div className="py-1 text-slate-800 dark:text-slate-200 text-xs truncate font-medium">
            {projectDetails.reviewer}
          </div>
        </div>

        {/* Review Date */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block tracking-wider">
            Review Date
          </span>
          <div className="py-1 font-mono text-slate-800 dark:text-slate-200 text-xs font-semibold">
            {projectDetails.reviewDate}
          </div>
        </div>
      </div>

      {/* 2. Schedule Counts Strip (Clickable Navigation) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-center shadow-sm">
        {/* Total Activities */}
        <button
          type="button"
          onClick={() => onNavigate?.({ workspaceTab: 'activities' })}
          className="p-2.5 bg-slate-50 hover:bg-amber-50/70 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 rounded-lg border border-slate-200/80 hover:border-amber-400 dark:border-slate-800/80 transition-colors cursor-pointer"
          title="Open Activity Sheet"
        >
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Total Activities
          </span>
          <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {counts.totalActivities.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block font-mono">
            {counts.incompleteActivities.toLocaleString()} incomplete
          </span>
        </button>

        {/* Total WBS Nodes */}
        <button
          type="button"
          onClick={() => onNavigate?.({ workspaceTab: 'wbs' })}
          className="p-2.5 bg-slate-50 hover:bg-amber-50/70 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 rounded-lg border border-slate-200/80 hover:border-amber-400 dark:border-slate-800/80 transition-colors cursor-pointer"
          title="Open WBS Hierarchy Tree"
        >
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Total WBS Nodes
          </span>
          <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {counts.totalWbsNodes.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block">
            Work Breakdown Structure
          </span>
        </button>

        {/* Total Relationships */}
        <button
          type="button"
          onClick={() => onNavigate?.({ workspaceTab: 'gantt' })}
          className="p-2.5 bg-slate-50 hover:bg-amber-50/70 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 rounded-lg border border-slate-200/80 hover:border-amber-400 dark:border-slate-800/80 transition-colors cursor-pointer"
          title="Inspect Relationships in Gantt Chart"
        >
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Total Relationships
          </span>
          <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {counts.totalRelationships.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block font-mono">
            FS {counts.fsSharePct}% | FS Density {counts.fsDensity}
          </span>
        </button>

        {/* Total Resources */}
        <button
          type="button"
          onClick={() => onNavigate?.({ workspaceTab: 'resources' })}
          className="p-2.5 bg-slate-50 hover:bg-amber-50/70 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 rounded-lg border border-slate-200/80 hover:border-amber-400 dark:border-slate-800/80 transition-colors cursor-pointer"
          title="Open Resource Inspector"
        >
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Total Resources
          </span>
          <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {counts.totalResources.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block">
            labor + nonlabor + material
          </span>
        </button>

        {/* Negative Float Activities */}
        <button
          type="button"
          onClick={() => onNavigate?.({ dashboardSubTab: 'paths' })}
          className="p-2.5 bg-slate-50 hover:bg-amber-50/70 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 rounded-lg border border-slate-200/80 hover:border-amber-400 dark:border-slate-800/80 transition-colors cursor-pointer"
          title="Inspect Longest & Driving Paths"
        >
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Negative Float Activities
          </span>
          <span
            className={`text-xl font-mono font-bold tabular-nums ${
              counts.negativeFloatActivities > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {counts.negativeFloatActivities}
          </span>
          <span className="text-[10px] text-slate-500 block font-mono">
            {counts.totalActivities > 0 ? ((counts.negativeFloatActivities / counts.totalActivities) * 100).toFixed(1) : '0.0'}% of total
          </span>
        </button>

        {/* Critical Path Activities */}
        <button
          type="button"
          onClick={() => onNavigate?.({ dashboardSubTab: 'paths' })}
          className="p-2.5 bg-slate-50 hover:bg-amber-50/70 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 rounded-lg border border-slate-200/80 hover:border-amber-400 dark:border-slate-800/80 transition-colors cursor-pointer"
          title="Open Longest & Subsequent Paths Validator"
        >
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Critical Path Activities
          </span>
          <span className="text-xl font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {counts.criticalPathActivities.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block font-mono">
            {counts.criticalPathPct}% of all activities
          </span>
        </button>
      </div>
    </div>
  );
};

