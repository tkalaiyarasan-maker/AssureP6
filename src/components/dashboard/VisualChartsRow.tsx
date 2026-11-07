import React from 'react';
import { P6HealthCheckDashboardData, ThemeSummary } from '../../types/healthCheck';

interface VisualChartsRowProps {
  data: P6HealthCheckDashboardData;
}

export const VisualChartsRow: React.FC<VisualChartsRowProps> = ({ data }) => {
  const { themes, scoring } = data;

  // 1. Radar Chart Coordinates Calculation
  // 9 themes arranged in a circle
  const size = 320;
  const center = size / 2;
  const radius = 105;
  const numAxes = themes.length;

  const getCoordinates = (index: number, valuePct: number) => {
    // Start from top (angle = -PI/2)
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    const r = (radius * Math.min(100, Math.max(0, valuePct))) / 100;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const getAxisEnd = (index: number) => {
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    const x = center + (radius + 20) * Math.cos(angle);
    const y = center + (radius + 20) * Math.sin(angle);
    return { x, y };
  };

  // Score points string
  const scorePoints = themes
    .map((t, idx) => {
      const { x, y } = getCoordinates(idx, t.scorePct);
      return `${x},${y}`;
    })
    .join(' ');

  // Target points string (85% target)
  const targetPoints = themes
    .map((_, idx) => {
      const { x, y } = getCoordinates(idx, 85);
      return `${x},${y}`;
    })
    .join(' ');

  // Grid concentric rings
  const rings = [25, 50, 75, 100];

  // 2. Donut 1: Critical-key items
  const critPass = scoring.criticalItemsPassed;
  const critRecheck = scoring.criticalItemsFailedOrWarning;
  const critTotal = scoring.criticalItemsCount || 20;

  // SVG Donut calculation
  const donutRadius = 60;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const critPassOffset = donutCircumference - (critPass / critTotal) * donutCircumference;

  // 3. Donut 2: All 54 checks by status
  const total54 =
    scoring.statusCounts.pass +
    scoring.statusCounts.warning +
    scoring.statusCounts.fail +
    scoring.statusCounts.pending +
    scoring.statusCounts.na || 54;

  const pPct = scoring.statusCounts.pass / total54;
  const wPct = scoring.statusCounts.warning / total54;
  const fPct = scoring.statusCounts.fail / total54;
  const pePct = scoring.statusCounts.pending / total54;
  const naPct = scoring.statusCounts.na / total54;

  const segPass = pPct * donutCircumference;
  const segWarn = wPct * donutCircumference;
  const segFail = fPct * donutCircumference;
  const segPend = pePct * donutCircumference;
  const segNa = naPct * donutCircumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* 1. Radar / Spider Chart */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-md flex flex-col items-center">
        <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800/60 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            9-Theme Radar Evaluation
          </span>
          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-400 inline-block" />
              <span className="text-slate-300">Score</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-rose-400 inline-block" />
              <span className="text-slate-300">Target (85%)</span>
            </div>
          </div>
        </div>

        {/* SVG Radar */}
        <div className="relative w-full flex items-center justify-center">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[310px] h-auto overflow-visible select-none">
            {/* Concentric rings */}
            {rings.map((ringVal) => {
              const r = (radius * ringVal) / 100;
              const polyPoints = themes
                .map((_, idx) => {
                  const angle = (Math.PI * 2 * idx) / numAxes - Math.PI / 2;
                  return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                })
                .join(' ');

              return (
                <g key={ringVal}>
                  <polygon
                    points={polyPoints}
                    fill="none"
                    stroke="#334155"
                    strokeWidth="0.8"
                    strokeDasharray={ringVal === 100 ? 'none' : '2,2'}
                  />
                  <text
                    x={center + 3}
                    y={center - r + 3}
                    fill="#64748B"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {ringVal}%
                  </text>
                </g>
              );
            })}

            {/* Radial axis spokes */}
            {themes.map((t, idx) => {
              const end = getAxisEnd(idx);
              const spokeEnd = getCoordinates(idx, 100);

              // Text anchor placement
              const angle = (Math.PI * 2 * idx) / numAxes - Math.PI / 2;
              let textAnchor: 'start' | 'end' | 'middle' = 'middle';
              if (Math.cos(angle) > 0.3) textAnchor = 'start';
              else if (Math.cos(angle) < -0.3) textAnchor = 'end';

              return (
                <g key={t.theme}>
                  <line
                    x1={center}
                    y1={center}
                    x2={spokeEnd.x}
                    y2={spokeEnd.y}
                    stroke="#334155"
                    strokeWidth="0.75"
                  />
                  <text
                    x={end.x}
                    y={end.y + (Math.sin(angle) > 0.5 ? 8 : -2)}
                    textAnchor={textAnchor}
                    fill="#94A3B8"
                    fontSize="9.5"
                    fontWeight="500"
                    className="select-none"
                  >
                    {t.theme.replace('A: ', '')}
                  </text>
                </g>
              );
            })}

            {/* Target 85% Polygon (Red Dashed) */}
            <polygon
              points={targetPoints}
              fill="rgba(244, 63, 94, 0.05)"
              stroke="#F43F5E"
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />

            {/* Actual Score Polygon (Blue Solid) */}
            <polygon
              points={scorePoints}
              fill="rgba(56, 189, 248, 0.2)"
              stroke="#38BDF8"
              strokeWidth="2"
            />

            {/* Vertex dots */}
            {themes.map((t, idx) => {
              const pt = getCoordinates(idx, t.scorePct);
              return (
                <circle
                  key={t.theme}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill="#38BDF8"
                  stroke="#0F172A"
                  strokeWidth="1.5"
                >
                  <title>{`${t.theme}: ${t.scorePct}% (Target: 85%)`}</title>
                </circle>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 2. Donut Chart 1: Critical-key items (Yes) */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-md flex flex-col items-center justify-between">
        <div className="w-full pb-2 border-b border-slate-800/60 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Critical-Key Items (Yes)
          </span>
        </div>

        {/* SVG Donut */}
        <div className="relative flex items-center justify-center my-3">
          <svg className="w-48 h-48 -rotate-90">
            {/* Background track */}
            <circle
              cx="96"
              cy="96"
              r={donutRadius}
              fill="transparent"
              stroke="#1E293B"
              strokeWidth="22"
            />
            {/* Pass Segment (Green) */}
            <circle
              cx="96"
              cy="96"
              r={donutRadius}
              fill="transparent"
              stroke="#10B981"
              strokeWidth="22"
              strokeDasharray={donutCircumference}
              strokeDashoffset={critPassOffset}
              strokeLinecap="round"
            />
            {/* Fail/Recheck Segment if any (Red) */}
            {critRecheck > 0 && (
              <circle
                cx="96"
                cy="96"
                r={donutRadius}
                fill="transparent"
                stroke="#EF4444"
                strokeWidth="22"
                strokeDasharray={`${(critRecheck / critTotal) * donutCircumference} ${donutCircumference}`}
                strokeDashoffset={-((critPass / critTotal) * donutCircumference)}
              />
            )}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-mono font-extrabold text-slate-100">
              {critTotal}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              {critRecheck === 0 ? '100% Passed' : `${critRecheck} Recheck`}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] pt-2 border-t border-slate-800/80 w-full font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            <span className="text-slate-300">Critical – Pass ({critPass})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
            <span className="text-slate-400">Critical – Recheck ({critRecheck})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            <span className="text-slate-400">Critical – Other (0)</span>
          </div>
        </div>
      </div>

      {/* 3. Donut Chart 2: All 54 Checks by Status */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-md flex flex-col items-center justify-between">
        <div className="w-full pb-2 border-b border-slate-800/60 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            All 54 Checks by Status
          </span>
        </div>

        {/* Multi-segment Donut */}
        <div className="relative flex items-center justify-center my-3">
          <svg className="w-48 h-48 -rotate-90">
            <circle
              cx="96"
              cy="96"
              r={donutRadius}
              fill="transparent"
              stroke="#1E293B"
              strokeWidth="22"
            />
            {/* Pass Segment */}
            <circle
              cx="96"
              cy="96"
              r={donutRadius}
              fill="transparent"
              stroke="#10B981"
              strokeWidth="22"
              strokeDasharray={`${segPass} ${donutCircumference}`}
              strokeDashoffset="0"
            />
            {/* Warning Segment */}
            <circle
              cx="96"
              cy="96"
              r={donutRadius}
              fill="transparent"
              stroke="#F59E0B"
              strokeWidth="22"
              strokeDasharray={`${segWarn} ${donutCircumference}`}
              strokeDashoffset={-segPass}
            />
            {/* Fail Segment */}
            <circle
              cx="96"
              cy="96"
              r={donutRadius}
              fill="transparent"
              stroke="#EF4444"
              strokeWidth="22"
              strokeDasharray={`${segFail} ${donutCircumference}`}
              strokeDashoffset={-(segPass + segWarn)}
            />
            {/* Pending Segment */}
            <circle
              cx="96"
              cy="96"
              r={donutRadius}
              fill="transparent"
              stroke="#64748B"
              strokeWidth="22"
              strokeDasharray={`${segPend} ${donutCircumference}`}
              strokeDashoffset={-(segPass + segWarn + segFail)}
            />
          </svg>

          {/* Center Info */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-mono font-extrabold text-slate-100">
              54
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Total Checks
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] pt-2 border-t border-slate-800/80 w-full font-mono">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            <span className="text-slate-300">Pass ({scoring.statusCounts.pass})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            <span className="text-slate-300">Warning ({scoring.statusCounts.warning})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
            <span className="text-slate-300">Fail ({scoring.statusCounts.fail})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-500 inline-block" />
            <span className="text-slate-300">Pending ({scoring.statusCounts.pending})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
