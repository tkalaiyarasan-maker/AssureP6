import React, { useMemo, useState, useRef } from 'react';
import { ParsedProject, WbsNode } from '../types/xer';
import {
  computeResourceTimephased,
  TimeBucketGranularity,
  TimephasedBucket,
  TimephasedMetric,
} from '../utils/resourceTimephased';
import { downloadCsvFile, formatCurrencyAmount } from '../utils/scheduleAnalysis';
import {
  BarChart3,
  Download,
  Image as ImageIcon,
  FileCode2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Calendar as CalendarIcon,
  Layers,
} from 'lucide-react';

interface ResourceHistogramSCurveProps {
  project: ParsedProject;
  scopeTitle: string;
  scopeSubtitle: string;
  selectedResourceIds: Set<string> | null; // null => Whole Project
  singleLeafResourceId?: string | null;
}

type ChartDisplayMode = 'combined' | 'histogram' | 'scurve';
type HistogramStyle = 'plan_vs_actual' | 'stacked_type';

function formatCompactNumber(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  if (abs >= 100) return `${sign}${Math.round(abs).toLocaleString()}`;
  if (abs === 0) return '0';
  return `${sign}${Number(abs.toFixed(1)).toLocaleString()}`;
}

function niceAxisMax(maxVal: number): number {
  if (!Number.isFinite(maxVal) || maxVal <= 0) return 10;
  const exp = Math.floor(Math.log10(maxVal));
  const pow = Math.pow(10, exp);
  const frac = maxVal / pow;
  let niceFrac = 1;
  if (frac <= 1) niceFrac = 1;
  else if (frac <= 1.5) niceFrac = 1.5;
  else if (frac <= 2) niceFrac = 2;
  else if (frac <= 2.5) niceFrac = 2.5;
  else if (frac <= 3) niceFrac = 3;
  else if (frac <= 4) niceFrac = 4;
  else if (frac <= 5) niceFrac = 5;
  else if (frac <= 6) niceFrac = 6;
  else if (frac <= 8) niceFrac = 8;
  else niceFrac = 10;
  return niceFrac * pow;
}

export const ResourceHistogramSCurve: React.FC<ResourceHistogramSCurveProps> = ({
  project,
  scopeTitle,
  scopeSubtitle,
  selectedResourceIds,
  singleLeafResourceId,
}) => {
  const [metric, setMetric] = useState<TimephasedMetric>('cost');
  const [displayMode, setDisplayMode] = useState<ChartDisplayMode>('combined');
  const [granularity, setGranularity] = useState<TimeBucketGranularity>('month');
  const [histogramStyle, setHistogramStyle] = useState<HistogramStyle>('plan_vs_actual');
  const [showBananaCurve, setShowBananaCurve] = useState(true);
  const [useCalendarAware, setUseCalendarAware] = useState(true);
  const [useP6Curves, setUseP6Curves] = useState(true);
  const [selectedWbsId, setSelectedWbsId] = useState<string>('ALL');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tableExpanded, setTableExpanded] = useState(true);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Flatten top WBS levels for clean WBS filter selector
  const wbsOptions = useMemo(() => {
    const opts: { id: string; label: string; level: number }[] = [];
    const walk = (nodes: WbsNode[], depth: number) => {
      for (const n of nodes) {
        if (depth <= 2) {
          opts.push({
            id: n.id,
            label: `${'— '.repeat(depth)}${n.code} ${n.name}`,
            level: depth,
          });
        }
        if (n.children.length > 0 && depth < 2) {
          walk(n.children, depth + 1);
        }
      }
    };
    walk(project.wbsHierarchy, 0);
    return opts;
  }, [project.wbsHierarchy]);

  // Collect all descendant WBS IDs for the selected WBS filter
  const wbsSubtreeIds = useMemo<Set<string> | null>(() => {
    if (selectedWbsId === 'ALL') return null;
    const node = project.wbsMap.get(selectedWbsId);
    if (!node) return null;
    const set = new Set<string>();
    const collect = (n: WbsNode) => {
      set.add(n.id);
      for (const c of n.children) collect(c);
    };
    collect(node);
    return set;
  }, [selectedWbsId, project.wbsMap]);

  const data = useMemo(
    () =>
      computeResourceTimephased(project, {
        selectedResourceIds,
        singleLeafResourceId,
        wbsSubtreeIds,
        granularity,
        metric,
        useCalendarAware,
        useP6Curves,
      }),
    [
      project,
      selectedResourceIds,
      singleLeafResourceId,
      wbsSubtreeIds,
      granularity,
      metric,
      useCalendarAware,
      useP6Curves,
    ]
  );

  const currencySymbol = project.metadata.currencySymbol || '$';
  const currencyCode = project.metadata.currencyCode || 'USD';
  const currencyDecimals = project.metadata.currencyDecimalDigits ?? 2;

  const formatPeriodValue = (val: number): string => {
    if (metric === 'cost') {
      return formatCurrencyAmount(val, currencySymbol, currencyCode, currencyDecimals);
    }
    if (metric === 'manpower') {
      return `${val.toLocaleString(undefined, { maximumFractionDigits: 1 })} heads`;
    }
    return `${val.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${data.unitLabel}`;
  };

  const formatCumValue = (val: number): string => {
    if (metric === 'cost') {
      return formatCurrencyAmount(val, currencySymbol, currencyCode, currencyDecimals);
    }
    if (metric === 'manpower') {
      return `${Math.round(val).toLocaleString()} man-days`;
    }
    return `${Math.round(val).toLocaleString()} ${data.cumUnitLabel}`;
  };

  const formatAxisVal = (val: number): string => {
    if (metric === 'cost') {
      const prefix = currencySymbol || currencyCode;
      const needsSpace = /[A-Za-z.]$/.test(prefix);
      return `${prefix}${needsSpace ? ' ' : ''}${formatCompactNumber(val)}`;
    }
    return formatCompactNumber(val);
  };

  // Chart SVG dimensions and coordinate math
  const svgW = 1040;
  const svgH = 400;
  const margin = { top: 34, right: 78, bottom: 56, left: 78 };
  const plotW = svgW - margin.left - margin.right;
  const plotH = svgH - margin.top - margin.bottom;

  const buckets = data.buckets;
  const n = buckets.length;

  // Left axis max (Period histogram demand)
  const rawPeriodMax = useMemo(() => {
    let m = 0;
    for (const b of buckets) {
      const stackSum = b.labor + b.nonLabor + b.material;
      const candidate = Math.max(
        b.planned,
        b.actual + b.remaining,
        histogramStyle === 'stacked_type' ? stackSum : 0,
        b.maxLimit || 0
      );
      if (candidate > m) m = candidate;
    }
    return niceAxisMax(m * 1.12 || 10);
  }, [buckets, histogramStyle]);

  // Right axis max (Cumulative S-Curve)
  const rawCumMax = useMemo(() => {
    let m = 0;
    for (const b of buckets) {
      const candidate = Math.max(b.cumPlanned, b.cumForecast, b.cumActual, b.cumLatePlanned);
      if (candidate > m) m = candidate;
    }
    return niceAxisMax(m * 1.08 || 10);
  }, [buckets]);

  const yLeft = (val: number) => margin.top + plotH - (Math.max(0, val) / rawPeriodMax) * plotH;
  const yRight = (val: number) => margin.top + plotH - (Math.max(0, val) / rawCumMax) * plotH;
  const bandW = n > 0 ? plotW / n : plotW;
  const xCenter = (idx: number) => margin.left + (idx + 0.5) * bandW;
  const xRightEdge = (idx: number) => margin.left + (idx + 1) * bandW;

  // S-Curve polyline paths (starting from left edge of first bucket at 0 -> right edge of each bucket)
  const buildCurvePath = (getter: (b: TimephasedBucket) => number, maxIdx = n - 1): string => {
    if (n === 0 || maxIdx < 0) return '';
    const pts: string[] = [`${margin.left},${yRight(0)}`];
    for (let i = 0; i <= maxIdx; i++) {
      pts.push(`${xRightEdge(i).toFixed(1)},${yRight(getter(buckets[i])).toFixed(1)}`);
    }
    return pts.join(' ');
  };

  // Banana Curve polygon between Early Planned and Late Planned
  const bananaPolygonPoints = useMemo(() => {
    if (!showBananaCurve || !data.hasLateDates || n === 0) return '';
    const upper: string[] = [`${margin.left},${yRight(0)}`];
    const lower: string[] = [];
    for (let i = 0; i < n; i++) {
      upper.push(`${xRightEdge(i).toFixed(1)},${yRight(buckets[i].cumPlanned).toFixed(1)}`);
    }
    for (let i = n - 1; i >= 0; i--) {
      lower.push(`${xRightEdge(i).toFixed(1)},${yRight(buckets[i].cumLatePlanned).toFixed(1)}`);
    }
    lower.push(`${margin.left},${yRight(0)}`);
    return [...upper, ...lower].join(' ');
  }, [showBananaCurve, data.hasLateDates, buckets, n, rawCumMax]);

  // Last index where Actuals occurred (or up to Data Date)
  const lastActualIdx = useMemo(() => {
    if (!data.hasActuals) return -1;
    let idx = -1;
    for (let i = 0; i < n; i++) {
      if (buckets[i].actual > 0 || buckets[i].isBeforeOrAtDataDate) idx = i;
    }
    return idx;
  }, [buckets, n, data.hasActuals]);

  // X-axis label stride so labels never collide
  const labelStride = Math.max(1, Math.ceil(n / 14));

  // Data Date vertical X coordinate
  const dataDateX =
    data.dataDateBucketFraction !== undefined && n > 0
      ? margin.left + data.dataDateBucketFraction * bandW
      : null;

  // Export CSV
  const handleExportCsv = () => {
    const slug = scopeTitle.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    const headers = [
      'Period',
      'Start Date',
      'End Date',
      'Working Days',
      `Period Planned (${data.unitLabel})`,
      `Period Actual (${data.unitLabel})`,
      `Period Remaining (${data.unitLabel})`,
      `Period Late Planned (${data.unitLabel})`,
      `Cum Planned (${data.cumUnitLabel})`,
      `Cum Actual (${data.cumUnitLabel})`,
      `Cum Forecast (${data.cumUnitLabel})`,
      `Cum Late (${data.cumUnitLabel})`,
      'Cum Planned %',
      'Cum Forecast %',
      'Cum Late %',
      ...(data.hasMaxLimit ? [`Max Capacity (${data.unitLabel})`, 'Overallocated'] : []),
    ];

    const rows = buckets.map((b) => [
      b.label,
      b.startIso,
      b.endIso,
      b.workingDays,
      Number(b.planned.toFixed(2)),
      Number(b.actual.toFixed(2)),
      Number(b.remaining.toFixed(2)),
      Number(b.latePlanned.toFixed(2)),
      Number(b.cumPlanned.toFixed(2)),
      Number(b.cumActual.toFixed(2)),
      Number(b.cumForecast.toFixed(2)),
      Number(b.cumLatePlanned.toFixed(2)),
      `${b.cumPlannedPct}%`,
      `${b.cumForecastPct}%`,
      `${b.cumLatePlannedPct}%`,
      ...(data.hasMaxLimit
        ? [b.maxLimit !== undefined ? Number(b.maxLimit.toFixed(2)) : '', b.isOverallocated ? 'YES' : 'NO']
        : []),
    ]);

    downloadCsvFile(
      `${project.metadata.code}_${slug}_${metric}_${granularity}_SCurve.csv`,
      headers,
      rows
    );
  };

  // Build standalone self-contained SVG string with explicit light presentation styles for crisp Word/PPT export
  const buildExportSvgMarkup = (): string | null => {
    if (!svgRef.current) return null;
    const isDark = document.documentElement.classList.contains('dark');
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const exportH = svgH + 54;
    clone.setAttribute('viewBox', `0 0 ${svgW} ${exportH}`);
    clone.setAttribute('width', String(svgW));
    clone.setAttribute('height', String(exportH));

    // Inline grid/axis colors on cloned nodes so standalone SVG/PNG renders crisply outside Tailwind CSS
    const gridStroke = isDark ? '#1e293b' : '#e2e8f0';
    const axisFill = isDark ? '#94a3b8' : '#64748b';
    const cumFill = isDark ? '#818cf8' : '#4f46e5';
    clone.querySelectorAll('line').forEach((el) => {
      if (el.getAttribute('stroke') === 'currentColor') {
        el.setAttribute('stroke', gridStroke);
      }
    });
    clone.querySelectorAll('text').forEach((el) => {
      if (!el.getAttribute('fill')) {
        const cls = el.getAttribute('class') || '';
        el.setAttribute('fill', cls.includes('indigo') ? cumFill : axisFill);
      }
    });

    // Shift existing chart elements down by 42px for title header
    const innerWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    innerWrapper.setAttribute('transform', 'translate(0, 42)');
    while (clone.firstChild) {
      innerWrapper.appendChild(clone.firstChild);
    }

    // Solid background rect
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', String(svgW));
    bg.setAttribute('height', String(exportH));
    bg.setAttribute('fill', isDark ? '#0f172a' : '#ffffff');

    // Title + subtitle text
    const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleEl.setAttribute('x', '24');
    titleEl.setAttribute('y', '24');
    titleEl.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
    titleEl.setAttribute('font-size', '14');
    titleEl.setAttribute('font-weight', '700');
    titleEl.setAttribute('fill', isDark ? '#f1f5f9' : '#0f172a');
    titleEl.textContent = `${project.metadata.code} — ${scopeTitle} (${
      metric === 'cost' ? `Cost · ${currencyCode}` : metric === 'manpower' ? 'Manpower (Heads/Day)' : `Units (${data.unitLabel})`
    })`;

    const subEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    subEl.setAttribute('x', '24');
    subEl.setAttribute('y', '40');
    subEl.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
    subEl.setAttribute('font-size', '11');
    subEl.setAttribute('fill', isDark ? '#94a3b8' : '#475569');
    subEl.textContent = `Period: ${granularity.toUpperCase()} · Planned: ${formatCumValue(data.totalPlanned)} · Peak: ${formatPeriodValue(data.peakPeriodValue)} (${data.peakPeriodLabel}) · Data Date: ${data.dataDateIso || 'N/A'}`;

    clone.appendChild(bg);
    clone.appendChild(titleEl);
    clone.appendChild(subEl);
    clone.appendChild(innerWrapper);

    return new XMLSerializer().serializeToString(clone);
  };

  const handleDownloadSvg = () => {
    const markup = buildExportSvgMarkup();
    if (!markup) return;
    const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = scopeTitle.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    a.href = url;
    a.download = `${project.metadata.code}_${slug}_${metric}_SCurve.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = () => {
    const markup = buildExportSvgMarkup();
    if (!markup) return;
    const img = new Image();
    const svgBlob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = svgW * scale;
      canvas.height = (svgH + 54) * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        const slug = scopeTitle.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
        a.href = pngUrl;
        a.download = `${project.metadata.code}_${slug}_${metric}_SCurve.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const hoveredBucket = hoveredIdx !== null && buckets[hoveredIdx] ? buckets[hoveredIdx] : null;
  const showBars = displayMode === 'combined' || displayMode === 'histogram';
  const showLines = displayMode === 'combined' || displayMode === 'scurve';

  const actualPctOfPlan =
    data.totalPlanned > 0 ? Math.round((data.totalActual / data.totalPlanned) * 1000) / 10 : 0;

  return (
    <div className="space-y-5">
      {/* Scope Title + Action Exports Row */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{scopeTitle}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {scopeSubtitle}
            {' · '}
            <span className="font-mono tabular-nums">{data.totalAssignmentsIncluded.toLocaleString()}</span> assignments
            {data.curvedAssignmentsCount > 0 && (
              <>
                {' · '}
                <span className="font-mono tabular-nums">{data.curvedAssignmentsCount}</span> P6 curves detected
              </>
            )}
            {useCalendarAware && data.calendarNonWorkingDaysApplied > 0 && (
              <>
                {' · '}Calendar holidays/closures active
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={buckets.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={buckets.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            Download PNG
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            disabled={buckets.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileCode2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            SVG
          </button>
        </div>
      </div>

      {/* Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Switcher */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            {(
              [
                { id: 'cost', label: `Cost (${currencyCode})` },
                { id: 'units', label: 'Units / Hrs' },
                { id: 'manpower', label: 'Manpower (Heads)' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetric(m.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  metric === m.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Chart Mode Switcher */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            {(
              [
                { id: 'combined', label: 'Combined' },
                { id: 'histogram', label: 'Histogram' },
                { id: 'scurve', label: 'S-Curve' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setDisplayMode(mode.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  displayMode === mode.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Period Bucket Granularity */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            {(
              [
                { id: 'week', label: 'Weekly' },
                { id: 'month', label: 'Monthly' },
                { id: 'quarter', label: 'Quarterly' },
                { id: 'year', label: 'Yearly' },
              ] as const
            ).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGranularity(g.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  granularity === g.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* WBS Filter + Analysis Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {wbsOptions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedWbsId}
                onChange={(e) => setSelectedWbsId(e.target.value)}
                aria-label="Filter by WBS branch"
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs max-w-[200px] truncate focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All WBS Branches</option>
                {wbsOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showBars && metric !== 'manpower' && (
            <label className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={histogramStyle === 'stacked_type'}
                onChange={(e) =>
                  setHistogramStyle(e.target.checked ? 'stacked_type' : 'plan_vs_actual')
                }
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Stack by Type</span>
            </label>
          )}

          {showLines && (
            <label className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={showBananaCurve}
                onChange={(e) => setShowBananaCurve(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Early/Late Envelope</span>
            </label>
          )}

          <label
            className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer select-none whitespace-nowrap"
            title="Spread assignment quantities across P6 calendar working days (reflects weekends, holidays, and monsoon shutdowns)"
          >
            <input
              type="checkbox"
              checked={useCalendarAware}
              onChange={(e) => setUseCalendarAware(e.target.checked)}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span>Calendar-Aware</span>
          </label>

          <label
            className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer select-none whitespace-nowrap"
            title="Apply Primavera P6 21-point resource curves (%T RSRCCURVDATA) when assigned to activities"
          >
            <input
              type="checkbox"
              checked={useP6Curves}
              onChange={(e) => setUseP6Curves(e.target.checked)}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span>P6 Curves</span>
          </label>
        </div>
      </div>

      {/* Warning Notice if mixing incompatible Material units in Units mode */}
      {data.mixedMaterialUnitsWarning && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Multiple resource units ({data.distinctUnits.join(', ')}) are aggregated in Units mode. Switch to{' '}
            <strong>Cost ({currencyCode})</strong> or select a single resource/discipline on the left for homogeneous units.
          </span>
        </div>
      )}

      {/* 4-Column Summary KPI Strip (Single Elevation, Tabular Numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            {metric === 'cost'
              ? 'Total Planned Budget'
              : metric === 'manpower'
              ? 'Total Planned Effort'
              : 'Total Planned Units'}
          </span>
          <span className="text-lg font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5 block">
            {formatCumValue(data.totalPlanned)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {buckets.length} {granularity} periods
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Actual to Date</span>
          <span className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5 block">
            {formatCumValue(data.totalActual)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {actualPctOfPlan}% of Planned · DD {data.dataDateIso || 'N/A'}
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            Remaining &amp; Forecast (EAC)
          </span>
          <span className="text-lg font-mono font-bold text-sky-700 dark:text-sky-400 tabular-nums mt-0.5 block">
            {formatCumValue(data.totalRemaining)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            EAC {formatCumValue(data.totalEac)}
            {Math.abs(data.varianceAtCompletion) >= 1 && (
              <span
                className={
                  data.varianceAtCompletion > 0
                    ? ' text-rose-600 dark:text-rose-400'
                    : ' text-emerald-600 dark:text-emerald-400'
                }
              >
                {' '}
                ({data.varianceAtCompletion > 0 ? '+' : ''}
                {formatCompactNumber(data.varianceAtCompletion)})
              </span>
            )}
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            {metric === 'manpower' ? 'Peak Daily Headcount' : 'Peak Period Demand'}
          </span>
          <span className="text-lg font-mono font-bold text-amber-700 dark:text-amber-400 tabular-nums mt-0.5 block">
            {formatPeriodValue(data.peakPeriodValue)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {data.peakPeriodLabel}
            {data.hasMaxLimit && (
              <span
                className={
                  data.overallocatedBucketsCount > 0
                    ? ' text-rose-600 dark:text-rose-400 font-semibold'
                    : ' text-emerald-600 dark:text-emerald-400'
                }
              >
                {' '}
                · {data.overallocatedBucketsCount > 0 ? `${data.overallocatedBucketsCount} over limit` : 'Within limit'}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
        {buckets.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No time-phased resource data available for this selection.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {metric === 'manpower'
                ? 'Manpower (Headcount) mode requires Labor (RT_Labor) assignments with units. Try switching to Cost or Units.'
                : 'Select another RBS node, WBS branch, or verify that activities have resource assignments and schedule dates.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Interactive Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex flex-wrap items-center gap-4">
                {showBars && histogramStyle === 'plan_vs_actual' && (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-2.5 rounded-xs bg-slate-300 dark:bg-slate-600 border border-slate-400 dark:border-slate-500" />
                      Period Planned
                    </span>
                    {data.hasActuals && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-2.5 rounded-xs bg-emerald-500" />
                        Period Actual
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-2.5 rounded-xs bg-sky-500/80" />
                      Period Remaining
                    </span>
                  </>
                )}
                {showBars && histogramStyle === 'stacked_type' && metric !== 'manpower' && (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-2.5 rounded-xs bg-blue-500" />
                      Labor
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-2.5 rounded-xs bg-amber-500" />
                      Equipment / Non-Labor
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-2.5 rounded-xs bg-emerald-500" />
                      Material
                    </span>
                  </>
                )}
                {showLines && (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-4 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                      Early Planned S-Curve
                    </span>
                    {showBananaCurve && data.hasLateDates && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-4 h-0.5 border-t-2 border-dashed border-indigo-400 dark:border-indigo-300" />
                        Late S-Curve (Banana Envelope)
                      </span>
                    )}
                    {data.hasActuals && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-4 h-0.5 bg-emerald-600 dark:bg-emerald-400" />
                        Actual S-Curve
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500" />
                      Forecast (EAC) S-Curve
                    </span>
                  </>
                )}
                {data.hasMaxLimit && showBars && (
                  <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                    <span className="w-4 h-0.5 border-t-2 border-dashed border-rose-500" />
                    Max Resource Limit
                  </span>
                )}
              </div>

              {data.dataDateIso && (
                <span className="inline-flex items-center gap-1 font-mono text-rose-600 dark:text-rose-400">
                  <CalendarIcon className="w-3 h-3" />
                  Data Date: {data.dataDateIso}
                </span>
              )}
            </div>

            {/* Responsive Dual-Axis SVG Chart */}
            <div className="relative w-full overflow-x-auto">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-auto min-w-[680px] select-none"
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Horizontal Gridlines & Left/Right Axis Ticks */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                  const y = margin.top + plotH - frac * plotH;
                  const leftVal = rawPeriodMax * frac;
                  const rightVal = rawCumMax * frac;
                  const rightPct = data.totalPlanned > 0 ? Math.round((rightVal / data.totalPlanned) * 100) : Math.round(frac * 100);
                  return (
                    <g key={frac}>
                      <line
                        x1={margin.left}
                        y1={y}
                        x2={svgW - margin.right}
                        y2={y}
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800"
                        strokeDasharray={frac === 0 ? undefined : '3 3'}
                        strokeWidth={frac === 0 ? 1.2 : 1}
                      />
                      {/* Left Y-Axis Label (Period) */}
                      {showBars && (
                        <text
                          x={margin.left - 8}
                          y={y + 3.5}
                          textAnchor="end"
                          fontSize="10"
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                          className="fill-slate-500 dark:fill-slate-400"
                        >
                          {formatAxisVal(leftVal)}
                        </text>
                      )}
                      {/* Right Y-Axis Label (Cumulative + %) */}
                      {showLines && (
                        <text
                          x={svgW - margin.right + 8}
                          y={y + 3.5}
                          textAnchor="start"
                          fontSize="10"
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                          className="fill-indigo-600 dark:fill-indigo-400"
                        >
                          {formatCompactNumber(rightVal)} ({rightPct}%)
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Axis Titles */}
                {showBars && (
                  <text
                    x={margin.left}
                    y={16}
                    textAnchor="start"
                    fontSize="10"
                    fontWeight="600"
                    className="fill-slate-500 dark:fill-slate-400"
                  >
                    Period ({data.unitLabel})
                  </text>
                )}
                {showLines && (
                  <text
                    x={svgW - margin.right}
                    y={16}
                    textAnchor="end"
                    fontSize="10"
                    fontWeight="600"
                    className="fill-indigo-600 dark:fill-indigo-400"
                  >
                    Cumulative ({data.cumUnitLabel} / %)
                  </text>
                )}

                {/* Banana Curve Shaded Envelope (Early vs Late) */}
                {showLines && showBananaCurve && data.hasLateDates && bananaPolygonPoints && (
                  <polygon
                    points={bananaPolygonPoints}
                    fill="#6366f1"
                    fillOpacity={0.12}
                  />
                )}

                {/* Histogram Bars */}
                {showBars &&
                  buckets.map((b, i) => {
                    const pad = Math.min(4, bandW * 0.14);
                    const barW = Math.max(2, bandW - pad * 2);
                    const x0 = margin.left + i * bandW + pad;
                    const isHovered = hoveredIdx === i;

                    if (histogramStyle === 'stacked_type' && metric !== 'manpower') {
                      const hLabor = Math.max(0, (b.labor / rawPeriodMax) * plotH);
                      const hNonLabor = Math.max(0, (b.nonLabor / rawPeriodMax) * plotH);
                      const hMat = Math.max(0, (b.material / rawPeriodMax) * plotH);
                      const yBase = margin.top + plotH;
                      return (
                        <g key={b.key} opacity={isHovered ? 1 : 0.88}>
                          {hLabor > 0 && (
                            <rect
                              x={x0}
                              y={yBase - hLabor}
                              width={barW}
                              height={hLabor}
                              fill={b.isOverallocated ? '#ef4444' : '#3b82f6'}
                              rx={1}
                            />
                          )}
                          {hNonLabor > 0 && (
                            <rect
                              x={x0}
                              y={yBase - hLabor - hNonLabor}
                              width={barW}
                              height={hNonLabor}
                              fill={b.isOverallocated ? '#dc2626' : '#f59e0b'}
                              rx={1}
                            />
                          )}
                          {hMat > 0 && (
                            <rect
                              x={x0}
                              y={yBase - hLabor - hNonLabor - hMat}
                              width={barW}
                              height={hMat}
                              fill={b.isOverallocated ? '#b91c1c' : '#10b981'}
                              rx={1}
                            />
                          )}
                        </g>
                      );
                    }

                    // Plan vs Actual + Remaining mode
                    const hPlan = Math.max(0, (b.planned / rawPeriodMax) * plotH);
                    const hAct = Math.max(0, (b.actual / rawPeriodMax) * plotH);
                    const hRem = Math.max(0, (b.remaining / rawPeriodMax) * plotH);
                    const yBase = margin.top + plotH;

                    const innerW = Math.max(1.5, barW * 0.62);
                    const innerX = x0 + (barW - innerW) / 2;

                    return (
                      <g key={b.key}>
                        {/* Planned backdrop bar */}
                        {hPlan > 0 && (
                          <rect
                            x={x0}
                            y={yBase - hPlan}
                            width={barW}
                            height={hPlan}
                            fill={b.isOverallocated ? '#fecaca' : '#cbd5e1'}
                            fillOpacity={isHovered ? 0.85 : 0.55}
                            stroke={b.isOverallocated ? '#ef4444' : '#94a3b8'}
                            strokeWidth={0.8}
                            rx={1.5}
                          />
                        )}
                        {/* Actual bar */}
                        {hAct > 0 && (
                          <rect
                            x={innerX}
                            y={yBase - hAct}
                            width={innerW}
                            height={hAct}
                            fill="#10b981"
                            fillOpacity={isHovered ? 1 : 0.9}
                            rx={1}
                          />
                        )}
                        {/* Remaining forecast bar stacked above actual */}
                        {hRem > 0 && (
                          <rect
                            x={innerX}
                            y={yBase - hAct - hRem}
                            width={innerW}
                            height={hRem}
                            fill={b.isOverallocated ? '#ef4444' : '#0ea5e9'}
                            fillOpacity={isHovered ? 1 : 0.82}
                            rx={1}
                          />
                        )}
                      </g>
                    );
                  })}

                {/* Max Resource Capacity Limit Step Line (from %T RSRCRATE) */}
                {showBars && data.hasMaxLimit && (
                  <polyline
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={1.6}
                    strokeDasharray="5 4"
                    points={buckets
                      .map((b, i) => {
                        const yLim = yLeft(b.maxLimit || 0);
                        const xStart = margin.left + i * bandW;
                        const xEnd = xStart + bandW;
                        return `${xStart.toFixed(1)},${yLim.toFixed(1)} ${xEnd.toFixed(1)},${yLim.toFixed(1)}`;
                      })
                      .join(' ')}
                  />
                )}

                {/* Cumulative S-Curve Polylines */}
                {showLines && (
                  <g>
                    {/* Late Planned S-Curve */}
                    {showBananaCurve && data.hasLateDates && (
                      <polyline
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth={1.75}
                        strokeDasharray="5 4"
                        points={buildCurvePath((b) => b.cumLatePlanned)}
                      />
                    )}
                    {/* Early Planned S-Curve */}
                    <polyline
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth={2.4}
                      points={buildCurvePath((b) => b.cumPlanned)}
                    />
                    {/* Forecast (Actual + Remaining) S-Curve */}
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      points={buildCurvePath((b) => b.cumForecast)}
                    />
                    {/* Actual S-Curve up to Data Date / last actual bucket */}
                    {data.hasActuals && lastActualIdx >= 0 && (
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={2.6}
                        points={buildCurvePath((b) => b.cumActual, lastActualIdx)}
                      />
                    )}
                  </g>
                )}

                {/* Vertical Data Date Line */}
                {dataDateX !== null && (
                  <g>
                    <line
                      x1={dataDateX}
                      y1={margin.top - 4}
                      x2={dataDateX}
                      y2={margin.top + plotH}
                      stroke="#e11d48"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                    />
                    <text
                      x={Math.min(svgW - margin.right - 2, Math.max(margin.left + 2, dataDateX + 4))}
                      y={margin.top + 10}
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fill="#e11d48"
                    >
                      DD
                    </text>
                  </g>
                )}

                {/* Hover Crosshair & Active Data Dots */}
                {hoveredIdx !== null && hoveredBucket && (
                  <g>
                    <rect
                      x={margin.left + hoveredIdx * bandW}
                      y={margin.top}
                      width={bandW}
                      height={plotH}
                      fill="#f59e0b"
                      fillOpacity={0.08}
                    />
                    <line
                      x1={xCenter(hoveredIdx)}
                      y1={margin.top}
                      x2={xCenter(hoveredIdx)}
                      y2={margin.top + plotH}
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    {showLines && (
                      <>
                        <circle
                          cx={xRightEdge(hoveredIdx)}
                          cy={yRight(hoveredBucket.cumPlanned)}
                          r={4}
                          fill="#4f46e5"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                        <circle
                          cx={xRightEdge(hoveredIdx)}
                          cy={yRight(hoveredBucket.cumForecast)}
                          r={3.5}
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                        {data.hasActuals && hoveredIdx <= lastActualIdx && (
                          <circle
                            cx={xRightEdge(hoveredIdx)}
                            cy={yRight(hoveredBucket.cumActual)}
                            r={4}
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth={1.5}
                          />
                        )}
                      </>
                    )}
                  </g>
                )}

                {/* X-Axis Period Tick Labels */}
                {buckets.map((b, i) => {
                  if (i % labelStride !== 0 && i !== n - 1) return null;
                  return (
                    <text
                      key={b.key}
                      x={xCenter(i)}
                      y={margin.top + plotH + 18}
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      className="fill-slate-500 dark:fill-slate-400"
                    >
                      {b.shortLabel}
                    </text>
                  );
                })}

                {/* Transparent Hover Hit Columns */}
                {buckets.map((b, i) => (
                  <rect
                    key={`hit_${b.key}`}
                    x={margin.left + i * bandW}
                    y={margin.top}
                    width={bandW}
                    height={plotH}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredIdx(i)}
                  />
                ))}
              </svg>

              {/* Floating Period Inspector Readout */}
              {hoveredBucket && (
                <div className="mt-2 px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {hoveredBucket.label}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 ml-2 font-mono text-[11px]">
                      {hoveredBucket.startIso} to {hoveredBucket.endIso} · {hoveredBucket.workingDays} work days
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums text-[11px]">
                    <span>
                      <span className="text-slate-500 dark:text-slate-400">Plan:</span>{' '}
                      <strong className="text-slate-900 dark:text-slate-100">
                        {formatPeriodValue(hoveredBucket.planned)}
                      </strong>
                    </span>
                    {data.hasActuals && (
                      <span>
                        <span className="text-slate-500 dark:text-slate-400">Act:</span>{' '}
                        <strong className="text-emerald-700 dark:text-emerald-400">
                          {formatPeriodValue(hoveredBucket.actual)}
                        </strong>
                      </span>
                    )}
                    <span>
                      <span className="text-slate-500 dark:text-slate-400">Rem:</span>{' '}
                      <strong className="text-sky-700 dark:text-sky-400">
                        {formatPeriodValue(hoveredBucket.remaining)}
                      </strong>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span>
                      <span className="text-slate-500 dark:text-slate-400">Cum Plan:</span>{' '}
                      <strong className="text-indigo-700 dark:text-indigo-400">
                        {formatCumValue(hoveredBucket.cumPlanned)} ({hoveredBucket.cumPlannedPct}%)
                      </strong>
                    </span>
                    <span>
                      <span className="text-slate-500 dark:text-slate-400">Cum Forecast:</span>{' '}
                      <strong className="text-amber-700 dark:text-amber-400">
                        {formatCumValue(hoveredBucket.cumForecast)} ({hoveredBucket.cumForecastPct}%)
                      </strong>
                    </span>
                    {showBananaCurve && data.hasLateDates && (
                      <span>
                        <span className="text-slate-500 dark:text-slate-400">Cum Late:</span>{' '}
                        <strong className="text-indigo-500 dark:text-indigo-300">
                          {hoveredBucket.cumLatePlannedPct}%
                        </strong>
                      </span>
                    )}
                    {hoveredBucket.maxLimit !== undefined && (
                      <span
                        className={
                          hoveredBucket.isOverallocated
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : 'text-slate-600 dark:text-slate-400'
                        }
                      >
                        Limit: {formatPeriodValue(hoveredBucket.maxLimit)}
                        {hoveredBucket.isOverallocated ? ' (OVER)' : ''}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Excel-Ready Time-Phased Data Table */}
      {buckets.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
          <button
            type="button"
            onClick={() => setTableExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <span>
              Time-Phased Schedule Data Table ({buckets.length} {granularity} periods)
            </span>
            {tableExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {tableExpanded && (
            <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-2 px-3 whitespace-nowrap">Period</th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">Work Days</th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">
                      Planned ({data.unitLabel})
                    </th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">
                      Actual ({data.unitLabel})
                    </th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">
                      Remaining ({data.unitLabel})
                    </th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">
                      Cum. Planned ({data.cumUnitLabel})
                    </th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">
                      Cum. Forecast ({data.cumUnitLabel})
                    </th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">Cum. Plan %</th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">Cum. Forecast %</th>
                    {showBananaCurve && data.hasLateDates && (
                      <th className="py-2 px-3 text-right whitespace-nowrap">Cum. Late %</th>
                    )}
                    {data.hasMaxLimit && (
                      <th className="py-2 px-3 text-right whitespace-nowrap">Limit Status</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono tabular-nums">
                  {buckets.map((b, i) => (
                    <tr
                      key={b.key}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className={`transition-colors ${
                        hoveredIdx === i
                          ? 'bg-amber-50/70 dark:bg-amber-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="py-2 px-3 font-sans font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {b.label}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400">
                        {b.workingDays}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-200">
                        {formatPeriodValue(b.planned)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400">
                        {b.actual > 0 ? formatPeriodValue(b.actual) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right text-sky-700 dark:text-sky-400">
                        {b.remaining > 0 ? formatPeriodValue(b.remaining) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right text-indigo-700 dark:text-indigo-400 font-semibold">
                        {formatCumValue(b.cumPlanned)}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-700 dark:text-amber-400 font-semibold">
                        {formatCumValue(b.cumForecast)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                        {b.cumPlannedPct.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                        {b.cumForecastPct.toFixed(1)}%
                      </td>
                      {showBananaCurve && data.hasLateDates && (
                        <td className="py-2 px-3 text-right text-indigo-500 dark:text-indigo-300">
                          {b.cumLatePlannedPct.toFixed(1)}%
                        </td>
                      )}
                      {data.hasMaxLimit && (
                        <td
                          className={`py-2 px-3 text-right font-sans font-semibold ${
                            b.isOverallocated
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {b.isOverallocated ? 'Over Limit' : 'OK'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
