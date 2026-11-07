import React, { useState } from 'react';
import { P6HealthCheckDashboardData } from '../../types/healthCheck';
import { ExecutiveScoreCards } from './ExecutiveScoreCards';
import { VerdictBanner } from './VerdictBanner';
import { ProjectMetaAndCounts } from './ProjectMetaAndCounts';
import { VisualChartsRow } from './VisualChartsRow';
import { StatisticalDistributionsRow } from './StatisticalDistributionsRow';
import { DetailedScoringTable } from './DetailedScoringTable';
import {
  LayoutDashboard,
  Table as TableIcon,
  BarChart3,
  Award,
  ListOrdered,
  FileSpreadsheet,
} from 'lucide-react';

interface P6HealthCheckDashboardProps {
  data: P6HealthCheckDashboardData;
}

type DashboardSubTab = 'overview' | 'distributions' | 'checklist' | 'ranked';

export const P6HealthCheckDashboard: React.FC<P6HealthCheckDashboardProps> = ({ data }) => {
  const [subTab, setSubTab] = useState<DashboardSubTab>('overview');

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* 1. Master Header Title Banner */}
      <div className="px-6 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-400" />
          <h1 className="text-base font-extrabold tracking-wide uppercase text-slate-100">
            P6 Programme Health Check – Dashboard
          </h1>
        </div>

        {/* Sub-view Navigation Tabs */}
        <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium">
          <button
            onClick={() => setSubTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              subTab === 'overview'
                ? 'bg-slate-800 text-slate-100 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-sky-400" />
            Executive Overview
          </button>
          <button
            onClick={() => setSubTab('distributions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              subTab === 'distributions'
                ? 'bg-slate-800 text-slate-100 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            Histograms &amp; Scatter Plot
          </button>
          <button
            onClick={() => setSubTab('checklist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              subTab === 'checklist'
                ? 'bg-slate-800 text-slate-100 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5 text-amber-400" />
            54-Parameter Checklist
          </button>
          <button
            onClick={() => setSubTab('ranked')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              subTab === 'ranked'
                ? 'bg-slate-800 text-slate-100 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 text-rose-400" />
            Ranked Deficiencies ({data.rankedDeficiencies.length})
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body containing the exact layout */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
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

            {/* Core Histograms & Scatter Plot Preview */}
            <StatisticalDistributionsRow data={data} />
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
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Ranked Priority Issues – Largest Units Lost First
                </h3>
                <p className="text-xs text-slate-400">
                  Items having highest point deduction in the 100-unit evaluation. Resolving these will yield the fastest score recovery.
                </p>
              </div>
              <span className="text-xs font-mono text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800">
                Total Units Lost: {(100 - data.scoring.totalUnitsEarned).toFixed(2)}
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 font-mono text-xs">
              {data.rankedDeficiencies.map((item, idx) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4 hover:bg-slate-800/30 px-2 rounded transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-slate-500 font-semibold">{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                      {item.id}
                    </span>
                    <div>
                      <span className="font-sans font-medium text-slate-200">{item.parameter}</span>
                      <div className="text-[11px] text-slate-400 font-sans flex items-center gap-2 mt-0.5">
                        <span>Theme: {item.theme}</span>
                        <span>·</span>
                        <span>Target: {item.targetStr} (Actual: {item.resultStr})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <span className="text-rose-400 font-bold text-sm block tabular-nums">
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
