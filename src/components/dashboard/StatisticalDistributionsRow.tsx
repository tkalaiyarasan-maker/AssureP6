import React from 'react';
import { P6HealthCheckDashboardData } from '../../types/healthCheck';
import { BarChart3, ScatterChart as ScatterIcon, Layers, Users, Calendar } from 'lucide-react';

interface StatisticalDistributionsRowProps {
  data: P6HealthCheckDashboardData;
}

export const StatisticalDistributionsRow: React.FC<StatisticalDistributionsRowProps> = ({ data }) => {
  const { statisticalDistributions } = data;
  const {
    remainingDurationRanges,
    lagsAndLeadsRanges,
    totalFloatRanges,
    resourcesTypeBreakdown,
    calendarAssignmentBreakdown,
    scatterPlotPoints,
  } = statisticalDistributions;

  // Max calculations for bar scaling
  const maxRemDur = Math.max(...remainingDurationRanges.map((r) => r.count), 1);
  const maxLags = Math.max(...lagsAndLeadsRanges.map((r) => r.count), 1);
  const maxFloat = Math.max(...totalFloatRanges.map((r) => r.count), 1);
  const maxAssign = Math.max(...resourcesTypeBreakdown.map((r) => r.noOfAssignments), 1);

  return (
    <div className="space-y-4">
      {/* Row 1: The 3 Core Histograms (Remaining Duration, Lags & Leads, Total Float) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* 1. Remaining Duration */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-md flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-800/60 mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Remaining Duration
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Working Days</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-1 pt-6 pb-2 px-1">
            {remainingDurationRanges.map((item, idx) => {
              const heightPct = Math.max(4, (item.count / maxRemDur) * 100);
              const isHigh = item.range === '45 – 88 d' || item.range === '89 + d';

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  {/* Number label above bar */}
                  <span className="text-[9.5px] font-mono text-slate-300 font-semibold mb-1 tabular-nums">
                    {item.count > 0 ? item.count.toLocaleString() : '0'}
                  </span>
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${
                      isHigh
                        ? 'bg-amber-500 hover:bg-amber-400'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  />
                  {/* Range label */}
                  <span className="text-[8.5px] text-slate-400 mt-1 font-mono text-center truncate w-full" title={item.range}>
                    {item.range}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Lag's & Lead's */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-md flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-800/60 mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Lag's &amp; Lead's
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Days</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-1 pt-6 pb-2 px-1">
            {lagsAndLeadsRanges.map((item, idx) => {
              const heightPct = Math.max(4, (item.count / maxLags) * 100);
              const isLead = item.range.includes('lead');
              const isHighLag = item.range === '> 20 d';

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <span className="text-[9.5px] font-mono text-slate-300 font-semibold mb-1 tabular-nums">
                    {item.count > 0 ? item.count.toLocaleString() : '0'}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${
                      isLead
                        ? 'bg-rose-500 hover:bg-rose-400'
                        : isHighLag
                        ? 'bg-rose-600 hover:bg-rose-500'
                        : item.range === '0 d (no lag)'
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-sky-600 hover:bg-sky-500'
                    }`}
                  />
                  <span className="text-[8px] text-slate-400 mt-1 font-mono text-center truncate w-full" title={item.range}>
                    {item.range}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Total Float */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-md flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-800/60 mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Total Float
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Working Days</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-1 pt-6 pb-2 px-1">
            {totalFloatRanges.map((item, idx) => {
              const heightPct = Math.max(4, (item.count / maxFloat) * 100);
              const isNegative = item.range.includes('negative');
              const isCritical = item.range.includes('critical');
              const isHighFloat = item.range === '45 – 88 d' || item.range === '> 88 d';

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <span className="text-[9.5px] font-mono text-slate-300 font-semibold mb-1 tabular-nums">
                    {item.count > 0 ? item.count.toLocaleString() : '0'}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${
                      isNegative
                        ? 'bg-rose-600 hover:bg-rose-500'
                        : isCritical
                        ? 'bg-emerald-500 hover:bg-emerald-400'
                        : isHighFloat
                        ? 'bg-amber-500 hover:bg-amber-400'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  />
                  <span className="text-[8.5px] text-slate-400 mt-1 font-mono text-center truncate w-full" title={item.range}>
                    {item.range}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Resources Breakdown & Calendar Assignment Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Resources and Assignment */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-md">
          <div className="pb-2 border-b border-slate-800/60 mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Resources and Assignment
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Counts &amp; Assignments</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {resourcesTypeBreakdown.map((res) => {
              const barHeightPct = Math.max(10, (res.noOfAssignments / maxAssign) * 100);
              return (
                <div key={res.type} className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-300">{res.type}</span>
                  <span className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {res.noOfResources} resources
                  </span>

                  <div className="w-full h-20 bg-slate-900/60 rounded my-2 flex items-end justify-center p-1">
                    <div
                      style={{ height: `${barHeightPct}%` }}
                      className="w-10 rounded-t bg-emerald-600 flex items-center justify-center transition-all"
                    />
                  </div>

                  <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                    {res.noOfAssignments.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">assignments</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendar Assignment */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-md">
          <div className="pb-2 border-b border-slate-800/60 mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Calendar Assignment
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Types &amp; Usage</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {calendarAssignmentBreakdown.map((cal) => (
              <div key={cal.type} className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex flex-col items-center justify-between">
                <span className="text-xs font-bold text-slate-300">{cal.type}</span>
                <div className="my-2 text-center">
                  <span className="text-2xl font-mono font-extrabold text-amber-400 block tabular-nums">
                    {cal.noOfCalendars}
                  </span>
                  <span className="text-[10px] text-slate-400">Calendars</span>
                </div>
                <span className="text-[11px] font-mono text-slate-300 tabular-nums">
                  {cal.noOfAssignments.toLocaleString()} assignments
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Scatter Plot - Total Float Vs Remaining Duration (d) */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl shadow-md">
        <div className="pb-2 border-b border-slate-800/60 mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ScatterIcon className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Total Float Vs Remaining Duration (d)
            </span>
          </div>
          {/* Threshold references */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-rose-500 inline-block" />
              <span className="text-rose-400 font-semibold">Total Float: 14D</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-rose-500 inline-block" />
              <span className="text-rose-400 font-semibold">Remaining Duration: 44D</span>
            </div>
          </div>
        </div>

        {/* SVG Scatter Chart Canvas */}
        <div className="relative w-full h-72 bg-slate-950 rounded-lg border border-slate-800 p-4 select-none">
          <svg viewBox="0 0 800 240" className="w-full h-full overflow-visible">
            {/* Grid Lines */}
            {[0, 100, 200, 300, 400, 500, 600, 700].map((yVal) => {
              const y = 220 - (yVal / 800) * 200;
              return (
                <g key={yVal}>
                  <line x1="40" y1={y} x2="780" y2={y} stroke="#1E293B" strokeWidth="0.8" />
                  <text x="32" y={y + 3} textAnchor="end" fill="#64748B" fontSize="9" fontFamily="monospace">
                    {yVal}
                  </text>
                </g>
              );
            })}

            {[0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500].map((xVal) => {
              const x = 40 + (xVal / 500) * 740;
              return (
                <g key={xVal}>
                  <line x1={x} y1="20" x2={x} y2="220" stroke="#1E293B" strokeWidth="0.8" />
                  <text x={x} y="235" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">
                    {xVal}
                  </text>
                </g>
              );
            })}

            {/* Threshold line: Total Float = 14D (Vertical dashed red) */}
            <line
              x1={40 + (14 / 500) * 740}
              y1="20"
              x2={40 + (14 / 500) * 740}
              y2="220"
              stroke="#F43F5E"
              strokeWidth="1.5"
              strokeDasharray="4,4"
            />
            <text
              x={40 + (14 / 500) * 740 + 4}
              y="32"
              fill="#F43F5E"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              14D Float
            </text>

            {/* Threshold line: Remaining Duration = 44D (Horizontal dashed red) */}
            <line
              x1="40"
              y1={220 - (44 / 800) * 200}
              x2="780"
              y2={220 - (44 / 800) * 200}
              stroke="#F43F5E"
              strokeWidth="1.5"
              strokeDasharray="4,4"
            />
            <text
              x="775"
              y={220 - (44 / 800) * 200 - 4}
              textAnchor="end"
              fill="#F43F5E"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              44D Duration
            </text>

            {/* Scatter dots */}
            {scatterPlotPoints.map((pt) => {
              const cx = 40 + (Math.min(500, Math.max(0, pt.totalFloat)) / 500) * 740;
              const cy = 220 - (Math.min(800, Math.max(0, pt.remainingDuration)) / 800) * 200;

              return (
                <circle
                  key={pt.id}
                  cx={cx}
                  cy={cy}
                  r="4"
                  fill={pt.isCritical ? '#F43F5E' : '#38BDF8'}
                  opacity="0.85"
                  className="hover:scale-150 cursor-pointer transition-transform"
                >
                  <title>{`${pt.code}: ${pt.name}\nTotal Float: ${pt.totalFloat}d | Rem Dur: ${pt.remainingDuration}d`}</title>
                </circle>
              );
            })}
          </svg>

          {/* Axis Labels */}
          <span className="absolute bottom-1 right-6 text-[10px] text-slate-500 font-mono">
            Total Float (days) &rarr;
          </span>
          <span className="absolute top-2 left-2 text-[10px] text-slate-500 font-mono -rotate-90 origin-top-left">
            &larr; Remaining Duration (days)
          </span>
        </div>
      </div>
    </div>
  );
};
