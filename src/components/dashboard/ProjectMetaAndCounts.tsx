import React from 'react';
import { P6HealthCheckDashboardData } from '../../types/healthCheck';

interface ProjectMetaAndCountsProps {
  data: P6HealthCheckDashboardData;
}

export const ProjectMetaAndCounts: React.FC<ProjectMetaAndCountsProps> = ({ data }) => {
  const { projectDetails, counts } = data;

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

        {/* Project Finish */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block tracking-wider">
            Project Finish
          </span>
          <div className="py-1 font-mono text-slate-800 dark:text-slate-200 text-xs font-semibold">
            {projectDetails.projectFinish}
          </div>
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

      {/* 2. Schedule Counts Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-center shadow-sm">
        {/* Total Activities */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Total Activities
          </span>
          <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {counts.totalActivities.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block font-mono">
            {counts.incompleteActivities.toLocaleString()} incomplete
          </span>
        </div>

        {/* Total WBS Nodes */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Total WBS Nodes
          </span>
          <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {counts.totalWbsNodes.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block">
            Work Breakdown Structure
          </span>
        </div>

        {/* Total Relationships */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Total Relationships
          </span>
          <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {counts.totalRelationships.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block font-mono">
            FS {counts.fsSharePct}% | FS Density {counts.fsDensity}
          </span>
        </div>

        {/* Total Resources */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Total Resources
          </span>
          <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {counts.totalResources.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block">
            labor + nonlabor + material
          </span>
        </div>

        {/* Negative Float Activities */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
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
            {((counts.negativeFloatActivities / counts.totalActivities) * 100).toFixed(1)}% of incomplete
          </span>
        </div>

        {/* Critical Path Activities */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Critical Path Activities
          </span>
          <span className="text-xl font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {counts.criticalPathActivities.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block font-mono">
            {counts.criticalPathPct}% of all activities
          </span>
        </div>
      </div>
    </div>
  );
};
