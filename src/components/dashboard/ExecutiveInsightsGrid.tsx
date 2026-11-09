import React from 'react';
import { ScheduleInsightsData, ScheduleInsightItem } from '../../types/healthCheck';
import {
  Network,
  Clock,
  Lock,
  Layers,
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface ExecutiveInsightsGridProps {
  insights: ScheduleInsightsData;
}

export const ExecutiveInsightsGrid: React.FC<ExecutiveInsightsGridProps> = ({ insights }) => {
  const renderStatusBadge = (status?: ScheduleInsightItem['status']) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Healthy
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Warning
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            Action Req.
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            Standard
          </span>
        );
    }
  };

  const sections = [
    {
      title: 'Logic Analysis',
      subtitle: 'Relationship topology, ties, loops & logic density',
      icon: Network,
      color: 'text-blue-600 dark:text-sky-400',
      bgColor: 'bg-blue-50/70 dark:bg-sky-950/20 border-blue-200 dark:border-sky-900/40',
      items: insights.logicAnalysis,
    },
    {
      title: 'Duration Analysis',
      subtitle: 'Activity span, extreme durations & float health',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40',
      items: insights.durationAnalysis,
    },
    {
      title: 'Constraints Analysis',
      subtitle: 'Hard vs soft date locks & artificial overrides',
      icon: Lock,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/40',
      items: insights.constraintsAnalysis,
    },
    {
      title: 'WBS & Activity Quality',
      subtitle: 'Work breakdown depth, integrity & naming duplicates',
      icon: Layers,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50/70 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/40',
      items: insights.wbsQuality,
    },
    {
      title: 'Resource Analysis',
      subtitle: 'Labor, equipment, material assignments & allocations',
      icon: Users,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40',
      items: insights.resourceAnalysis,
    },
    {
      title: 'Calendar Analysis',
      subtitle: 'Global, project & resource shift calendar consistency',
      icon: Calendar,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40',
      items: insights.calendarAnalysis,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with Title and Purpose */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 rotate-45 inline-block" />
            Baseline Evaluation Insights &amp; KPI Metrics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Key analytical indicators spanning Logic, Durations, Constraints, WBS Quality, Resources, and Calendars computed directly from the uploaded schedule.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold">
            6 Metric Categories
          </span>
          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-lg border border-amber-300 dark:border-amber-800 font-semibold">
            30+ Core Indicators
          </span>
        </div>
      </div>

      {/* 2x3 Grid of Analytical Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sections.map((section, idx) => {
          const SectionIcon = section.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col"
            >
              {/* Category Card Header */}
              <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${section.bgColor}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg bg-white/80 dark:bg-slate-900/80 shadow-xs ${section.color}`}>
                    <SectionIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {section.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {section.subtitle}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {section.items.length} KPIs
                </span>
              </div>

              {/* KPI Items Table */}
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
                    <tr>
                      <th className="px-3.5 py-2">KPI Parameter</th>
                      <th className="px-2 py-2 text-center w-12">Unit</th>
                      <th className="px-3 py-2 text-right">Value</th>
                      <th className="px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-mono">
                    {section.items.map((item, itemIdx) => (
                      <tr
                        key={itemIdx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-3.5 py-2.5 font-sans font-medium text-slate-800 dark:text-slate-200 text-xs">
                          <div>{item.kpi}</div>
                          <div className="text-[10px] text-slate-500 font-sans mt-0.5 truncate max-w-[200px]" title={item.formula}>
                            {item.formula}
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-center text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {item.unit}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100 text-xs tabular-nums">
                          {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                        </td>
                        <td className="px-3 py-2.5 text-right font-sans">
                          {renderStatusBadge(item.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
