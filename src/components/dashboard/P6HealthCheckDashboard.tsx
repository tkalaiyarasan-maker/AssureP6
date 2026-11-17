import React, { useState, useEffect } from 'react';
import { P6HealthCheckDashboardData } from '../../types/healthCheck';
import { Activity, ParsedProject } from '../../types/xer';
import { ExecutiveScoreCards, DashboardNavigationRequest } from './ExecutiveScoreCards';
import { VerdictBanner } from './VerdictBanner';
import { ProjectMetaAndCounts } from './ProjectMetaAndCounts';
import { VisualChartsRow } from './VisualChartsRow';
import { StatisticalDistributionsRow } from './StatisticalDistributionsRow';
import { DetailedScoringTable, FilterTab } from './DetailedScoringTable';
import { ExecutiveInsightsGrid } from './ExecutiveInsightsGrid';
import { ContractualMilestonesView } from './ContractualMilestonesView';
import { EmployerObligationsView } from './EmployerObligationsView';
import { CalendarsNonWorkingView } from './CalendarsNonWorkingView';
import { LongestAndBackwardPathsView } from './LongestAndBackwardPathsView';
import { HealthMethodologyModal } from './HealthMethodologyModal';
import {
  LayoutDashboard,
  Table as TableIcon,
  BarChart3,
  ListOrdered,
  Printer,
  Sparkles,
  Flag,
  Briefcase,
  Calendar,
  Route,
  BookOpen,
  ArrowUpRight,
} from 'lucide-react';

export type DashboardSubTab =
  | 'overview'
  | 'milestones'
  | 'obligations'
  | 'calendars'
  | 'paths'
  | 'insights'
  | 'distributions'
  | 'checklist'
  | 'ranked';

interface P6HealthCheckDashboardProps {
  data: P6HealthCheckDashboardData;
  project: ParsedProject;
  onSelectActivity: (act: Activity) => void;
  onNavigateWorkspace?: (req: DashboardNavigationRequest) => void;
  externalNavRequest?: (DashboardNavigationRequest & { rev: number }) | null;
}

export const P6HealthCheckDashboard: React.FC<P6HealthCheckDashboardProps> = ({
  data,
  project,
  onSelectActivity,
  onNavigateWorkspace,
  externalNavRequest,
}) => {
  const [subTab, setSubTab] = useState<DashboardSubTab>('overview');
  const [checklistFilter, setChecklistFilter] = useState<FilterTab>('all');
  const [checklistTheme, setChecklistTheme] = useState<string>('all');
  const [highlightParamId, setHighlightParamId] = useState<string | null>(null);
  const [backwardTargetId, setBackwardTargetId] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Sync external deep-link requests from Workspace (e.g. Trace Backward triggered from Gantt or Activity Sheet)
  useEffect(() => {
    if (!externalNavRequest) return;
    if (externalNavRequest.dashboardSubTab) {
      setSubTab(externalNavRequest.dashboardSubTab);
    }
    if (externalNavRequest.checklistFilter) {
      setChecklistFilter(externalNavRequest.checklistFilter);
    }
    if (externalNavRequest.themeFilter) {
      setChecklistTheme(externalNavRequest.themeFilter);
    }
    if (externalNavRequest.highlightParamId) {
      setHighlightParamId(externalNavRequest.highlightParamId);
    }
    if (externalNavRequest.backwardTargetId) {
      setBackwardTargetId(externalNavRequest.backwardTargetId);
    }
  }, [externalNavRequest]);

  const handleNavigate = (req: DashboardNavigationRequest) => {
    if (req.workspaceTab && req.workspaceTab !== 'healthDashboard') {
      onNavigateWorkspace?.(req);
      return;
    }

    if (req.checklistFilter) setChecklistFilter(req.checklistFilter);
    else if (req.dashboardSubTab === 'checklist' && !req.themeFilter && !req.highlightParamId) {
      setChecklistFilter('all');
    }

    if (req.themeFilter) setChecklistTheme(req.themeFilter);
    else if (req.dashboardSubTab === 'checklist' && !req.highlightParamId) {
      setChecklistTheme('all');
    }

    setHighlightParamId(req.highlightParamId || null);

    if (req.backwardTargetId) {
      setBackwardTargetId(req.backwardTargetId);
    }

    if (req.dashboardSubTab) {
      setSubTab(req.dashboardSubTab);
    }
  };

  const handleTraceBackward = (act: Activity) => {
    setBackwardTargetId(act.id);
    setSubTab('paths');
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const navItems: {
    id: DashboardSubTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
  }[] = [
    { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard, iconColor: 'text-sky-400' },
    { id: 'milestones', label: 'Contractual Milestones', icon: Flag, iconColor: 'text-amber-400' },
    { id: 'obligations', label: 'Employer Obligations', icon: Briefcase, iconColor: 'text-sky-400' },
    { id: 'calendars', label: 'Calendars & Non-Working', icon: Calendar, iconColor: 'text-emerald-400' },
    { id: 'paths', label: `Paths & Backward (${project.longestPaths?.length || 1})`, icon: Route, iconColor: 'text-rose-400' },
    { id: 'insights', label: 'Schedule Insights', icon: Sparkles, iconColor: 'text-amber-400' },
    { id: 'distributions', label: 'Histograms & Scatter', icon: BarChart3, iconColor: 'text-emerald-400' },
    { id: 'checklist', label: '54-Parameter Checklist', icon: TableIcon, iconColor: 'text-amber-400' },
    { id: 'ranked', label: `Ranked Deficiencies (${data.rankedDeficiencies.length})`, icon: ListOrdered, iconColor: 'text-rose-400' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg transition-colors print:border-none print:h-auto print:shadow-none">
      {/* 1. Master Header Title Banner */}
      <div className="px-5 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/80 flex flex-col gap-2.5 shadow-sm print:bg-slate-900 print:text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/assurep6-logo.png"
              alt="Assure P6"
              className="w-7 h-7 object-contain shrink-0"
            />
            <h1 className="text-base font-extrabold tracking-wide uppercase text-white">
              Assure P6 – Programme Health Check Dashboard
            </h1>
          </div>

          {/* Guide & PDF Export CTAs */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => setIsGuideOpen(true)}
              title="Open Parameter Definitions, Health Score Formula & Rating Guide"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Parameter &amp; Rating Guide</span>
            </button>

            <button
              onClick={handlePrintPdf}
              title="Download or Print Executive Health Check PDF Report"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-slate-950" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Sub-view Navigation Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 print:hidden">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-slate-700/90 text-white shadow ring-1 ring-amber-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.iconColor}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 bg-slate-100/60 dark:bg-slate-950">
        {/* Top 6 Clickable KPI Score Cards */}
        <ExecutiveScoreCards
          data={data}
          onNavigate={handleNavigate}
          onOpenGuide={() => setIsGuideOpen(true)}
        />

        {/* Verdict Banner */}
        <VerdictBanner data={data} />

        {/* Project Meta Details & Clickable Schedule Counts */}
        <ProjectMetaAndCounts data={data} onNavigate={handleNavigate} />

        {/* Dynamic Content based on active sub-tab */}
        {subTab === 'overview' && (
          <div className="space-y-4">
            <VisualChartsRow data={data} />
            <ExecutiveInsightsGrid insights={data.insights} onNavigate={handleNavigate} />
            <StatisticalDistributionsRow data={data} onNavigate={handleNavigate} />
          </div>
        )}

        {subTab === 'milestones' && (
          <ContractualMilestonesView
            project={project}
            onSelectActivity={onSelectActivity}
            onTraceBackward={handleTraceBackward}
          />
        )}

        {subTab === 'obligations' && (
          <EmployerObligationsView
            project={project}
            onSelectActivity={onSelectActivity}
            onTraceBackward={handleTraceBackward}
          />
        )}

        {subTab === 'calendars' && (
          <CalendarsNonWorkingView
            project={project}
            calendarAssignmentBreakdown={data.statisticalDistributions.calendarAssignmentBreakdown}
          />
        )}

        {subTab === 'paths' && (
          <LongestAndBackwardPathsView
            project={project}
            initialTargetActivityId={backwardTargetId}
            onSelectActivity={onSelectActivity}
          />
        )}

        {subTab === 'insights' && (
          <ExecutiveInsightsGrid insights={data.insights} onNavigate={handleNavigate} />
        )}

        {subTab === 'distributions' && (
          <StatisticalDistributionsRow data={data} onNavigate={handleNavigate} />
        )}

        {subTab === 'checklist' && (
          <DetailedScoringTable
            data={data}
            initialFilter={checklistFilter}
            initialTheme={checklistTheme}
            highlightParamId={highlightParamId}
            onNavigate={handleNavigate}
          />
        )}

        {subTab === 'ranked' && (
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Ranked Priority Issues – Largest Units Lost First
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Items having highest point deduction in the 100-unit evaluation. Click an item to view in the 54-Parameter Checklist or jump directly to the relevant report module.
                </p>
              </div>
              <span className="text-xs font-mono text-rose-700 dark:text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800">
                Total Units Lost: {(100 - data.scoring.totalUnitsEarned).toFixed(2)}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
              {data.rankedDeficiencies.map((item, idx) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 text-slate-400 dark:text-slate-500 font-semibold pt-0.5">{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-400 font-bold border border-amber-500/20">
                      {item.id}
                    </span>
                    <div>
                      <span className="font-sans font-semibold text-slate-800 dark:text-slate-200">
                        {item.parameter}
                      </span>
                      {item.description && (
                        <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.description}
                        </p>
                      )}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans flex flex-wrap items-center gap-2 mt-1">
                        <span>Theme: {item.theme}</span>
                        <span>·</span>
                        <span>Target: {item.targetStr} (Actual: {item.resultStr})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-right shrink-0 font-sans">
                    <button
                      onClick={() =>
                        handleNavigate({
                          dashboardSubTab: 'checklist',
                          checklistFilter: 'deficiencies',
                          highlightParamId: item.id,
                        })
                      }
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold transition-colors"
                    >
                      View in Checklist
                    </button>

                    {item.navigationTarget && (
                      <button
                        onClick={() =>
                          handleNavigate({
                            workspaceTab: item.navigationTarget?.workspaceTab,
                            dashboardSubTab: item.navigationTarget?.dashboardSubTab,
                            dcmaCheckId: item.navigationTarget?.dcmaCheckId,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold transition-colors"
                      >
                        {item.navigationTarget.label || 'Inspect'}
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}

                    <div className="min-w-[88px]">
                      <span className="text-rose-600 dark:text-rose-400 font-mono font-bold text-sm block tabular-nums">
                        -{item.unitsLost.toFixed(2)} units
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase">{item.action}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Parameter & Health Rating Methodology Modal */}
      <HealthMethodologyModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        data={data}
      />
    </div>
  );
};

