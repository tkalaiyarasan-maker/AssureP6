import React, { useState } from 'react';
import { P6HealthCheckDashboardData } from '../../types/healthCheck';
import { ExecutiveScoreCards } from './ExecutiveScoreCards';
import { VerdictBanner } from './VerdictBanner';
import { ProjectMetaAndCounts } from './ProjectMetaAndCounts';
import { VisualChartsRow } from './VisualChartsRow';
import { StatisticalDistributionsRow } from './StatisticalDistributionsRow';
import { DetailedScoringTable } from './DetailedScoringTable';
import { ExecutiveInsightsGrid } from './ExecutiveInsightsGrid';
import {
  LayoutDashboard,
  Table as TableIcon,
  BarChart3,
  Award,
  ListOrdered,
  Printer,
  Sparkles,
} from 'lucide-react';

interface P6HealthCheckDashboardProps {
  data: P6HealthCheckDashboardData;
}

type DashboardSubTab = 'overview' | 'insights' | 'distributions' | 'checklist' | 'ranked';

export const P6HealthCheckDashboard: React.FC<P6HealthCheckDashboardProps> = ({ data }) => {
  const [subTab, setSubTab] = useState<DashboardSubTab>('overview');

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg transition-colors print:border-none print:h-auto print:shadow-none">
      {/* 1. Master Header Title Banner (Executive Navy Banner matching reference image P61.png) */}
      <div className="px-6 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3 shadow-sm print:bg-slate-900 print:text-white">
        <div className="flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-400" />
          <h1 className="text-base font-extrabold tracking-wide uppercase text-white">
            P6 Programme Health Check – Dashboard
          </h1>
        </div>

        {/* Sub-view Navigation Tabs & PDF Export CTA */}
        <div className="flex items-center gap-2 print:hidden">
          <div className="flex items-center p-0.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs font-medium">
            <button
              onClick={() => setSubTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                subTab === 'overview'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-sky-400" />
              Executive Overview
            </button>
            <button
              onClick={() => setSubTab('insights')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                subTab === 'insights'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Schedule Insights (6 Categories)
            </button>
            <button
              onClick={() => setSubTab('distributions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                subTab === 'distributions'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              Histograms &amp; Scatter Plot
            </button>
            <button
              onClick={() => setSubTab('checklist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                subTab === 'checklist'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-amber-400" />
              54-Parameter Checklist
            </button>
            <button
              onClick={() => setSubTab('ranked')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                subTab === 'ranked'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-rose-400" />
              Ranked Deficiencies ({data.rankedDeficiencies.length})
            </button>
          </div>

          {/* Download PDF / Print Report Button */}
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

      {/* 2. Scrollable Body containing the exact layout */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 bg-slate-100/60 dark:bg-slate-950">
        {/* Top 6 KPI Score Cards */}
        <ExecutiveScoreCards data={data} />

        {/* Verdict Banner */}
        <VerdictBanner data={data} />

        {/* Project Meta Details & Schedule Counts */}
        <ProjectMetaAndCounts data={data} />

        {/* Dynamic Content based on active sub-tab */}
        {subTab === 'overview' && (
          <div className="space-y-4">
            {/* Visual Charts: Radar + 2 Donut Charts */}
            <VisualChartsRow data={data} />

            {/* Baseline Evaluation Insights & KPI Metrics */}
            <ExecutiveInsightsGrid insights={data.insights} />

            {/* Core Histograms & Scatter Plot Preview */}
            <StatisticalDistributionsRow data={data} />
          </div>
        )}

        {subTab === 'insights' && (
          <div>
            <ExecutiveInsightsGrid insights={data.insights} />
          </div>
        )}

        {subTab === 'distributions' && (
          <div>
            <StatisticalDistributionsRow data={data} />
          </div>
        )}

        {subTab === 'checklist' && (
          <div>
            <DetailedScoringTable data={data} />
          </div>
        )}

        {subTab === 'ranked' && (
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Ranked Priority Issues – Largest Units Lost First
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Items having highest point deduction in the 100-unit evaluation. Resolving these will yield the fastest score recovery.
                </p>
              </div>
              <span className="text-xs font-mono text-rose-700 dark:text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800">
                Total Units Lost: {(100 - data.scoring.totalUnitsEarned).toFixed(2)}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
              {data.rankedDeficiencies.map((item, idx) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-slate-400 dark:text-slate-500 font-semibold">{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-400 font-bold border border-amber-500/20">
                      {item.id}
                    </span>
                    <div>
                      <span className="font-sans font-medium text-slate-800 dark:text-slate-200">{item.parameter}</span>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans flex items-center gap-2 mt-0.5">
                        <span>Theme: {item.theme}</span>
                        <span>·</span>
                        <span>Target: {item.targetStr} (Actual: {item.resultStr})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <span className="text-rose-600 dark:text-rose-400 font-bold text-sm block tabular-nums">
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
    </div>
  );
};
