import React, { useState, useMemo, useRef } from 'react';
import { Activity, ParsedProject } from '../types/xer';
import {
  generateTilosModel,
  DISCIPLINE_COLORS,
} from '../utils/tilosGenerator';
import { TilosDiscipline, TilosActivityVector, TilosWbsSection } from '../types/tilos';
import {
  Calendar,
  Filter,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  MapPin,
  TrendingUp,
  Info,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  GitCommit,
} from 'lucide-react';

interface TilosTimeChainageChartProps {
  project: ParsedProject;
  onSelectActivity: (activity: Activity) => void;
  selectedActivityId?: string;
}

export const TilosTimeChainageChart: React.FC<TilosTimeChainageChartProps> = ({
  project,
  onSelectActivity,
  selectedActivityId,
}) => {
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('ALL');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');
  const [onlyCritical, setOnlyCritical] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredVector, setHoveredVector] = useState<TilosActivityVector | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Zoom scale
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 0.8, 1, 1.25, 1.5

  const containerRef = useRef<HTMLDivElement>(null);

  // Compute TILOS model using Level 3 WBS
  const tilosModel = useMemo(() => {
    return generateTilosModel(project);
  }, [project]);

  // Dimensions
  const kmSpan = Math.max(10, tilosModel.maxKm - tilosModel.minKm);
  const baseChartWidth = Math.max(1000, kmSpan * 18);
  const chartWidth = baseChartWidth * zoomLevel;

  // Monthly ticks calculation (Monthly Calendar Grid)
  const monthTicks = useMemo(() => {
    const ticks: { date: Date; label: string; yearLabel: string; timeMs: number }[] = [];
    const current = new Date(tilosModel.startDate);

    while (current <= tilosModel.finishDate) {
      const monthName = current.toLocaleString('default', { month: 'short' });
      const year = current.getFullYear();
      ticks.push({
        date: new Date(current),
        label: monthName,
        yearLabel: String(year),
        timeMs: current.getTime(),
      });
      current.setMonth(current.getMonth() + 1);
    }
    return ticks;
  }, [tilosModel.startDate, tilosModel.finishDate]);

  const monthRowHeight = 44 * zoomLevel;
  const chartHeight = Math.max(500, monthTicks.length * monthRowHeight);

  // Coordinate transforms
  // Distance / Chainage along X-Axis
  const getX = (km: number): number => {
    const ratio = (km - tilosModel.minKm) / kmSpan;
    return Math.max(0, Math.min(chartWidth, ratio * chartWidth));
  };

  // Monthly Time along Y-Axis (Top: Start Date -> Bottom: Finish Date)
  const startTimeMs = tilosModel.startDate.getTime();
  const finishTimeMs = tilosModel.finishDate.getTime();
  const totalTimeSpanMs = Math.max(1, finishTimeMs - startTimeMs);

  const getY = (timeMs: number): number => {
    const ratio = (timeMs - startTimeMs) / totalTimeSpanMs;
    return Math.max(0, Math.min(chartHeight, ratio * chartHeight));
  };

  // Data date line Y
  const dataDateY = project.metadata.dataDate ? getY(new Date(project.metadata.dataDate).getTime()) : null;

  // Filter vectors
  const filteredVectors = useMemo(() => {
    return tilosModel.vectors.filter((vec) => {
      if (onlyCritical && !vec.isCritical) return false;
      if (selectedDiscipline !== 'ALL' && vec.discipline !== selectedDiscipline) return false;
      if (selectedSectionId !== 'ALL' && vec.level3WbsId !== selectedSectionId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = vec.activity.code.toLowerCase().includes(q);
        const nameMatch = vec.activity.name.toLowerCase().includes(q);
        const wbsMatch = vec.level3WbsName.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !wbsMatch) return false;
      }

      return true;
    });
  }, [tilosModel.vectors, onlyCritical, selectedDiscipline, selectedSectionId, searchQuery]);

  // Chainage major ruler ticks (every 5 or 10 km)
  const chainageTicks = useMemo(() => {
    const ticks: { km: number; label: string; x: number }[] = [];
    const step = kmSpan > 100 ? 10 : kmSpan > 40 ? 5 : 2;
    const startRounded = Math.floor(tilosModel.minKm / step) * step;

    for (let km = startRounded; km <= tilosModel.maxKm; km += step) {
      if (km >= tilosModel.minKm && km <= tilosModel.maxKm) {
        ticks.push({
          km,
          label: `KM ${km.toFixed(0)}+000`,
          x: getX(km),
        });
      }
    }
    return ticks;
  }, [tilosModel.minKm, tilosModel.maxKm, kmSpan, chartWidth]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg transition-colors">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100">
              TILOS Time-Chainage Chart
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-700">
              Level 3 WBS Alignment Model
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Activity or Package..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-52 text-xs"
            />
          </div>

          {/* Level 3 WBS Section Filter */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Filter by Level 3 WBS Package"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="py-1 px-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="ALL">All Level 3 WBS Sections ({tilosModel.sections.length})</option>
              {tilosModel.sections.map((sec) => (
                <option key={sec.wbsId} value={sec.wbsId}>
                  {sec.wbsCode}: {sec.wbsName} (KM {sec.startKm} - {sec.endKm})
                </option>
              ))}
            </select>
          </div>

          {/* Construction Discipline Filter */}
          <select
            aria-label="Filter by Construction Discipline"
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="py-1 px-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="ALL">All Disciplines ({tilosModel.disciplinesPresent.length})</option>
            {tilosModel.disciplinesPresent.map((disc) => (
              <option key={disc} value={disc}>
                {disc}
              </option>
            ))}
          </select>

          {/* Critical Path Toggle */}
          <button
            onClick={() => setOnlyCritical(!onlyCritical)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
              onlyCritical
                ? 'bg-rose-500 text-white shadow-sm border-rose-600'
                : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:text-rose-600'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Critical Path Only
          </button>
        </div>

        {/* Zoom & Alignment Span stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800">
            <MapPin className="w-3 h-3 text-amber-500" />
            <span>Alignment: KM {tilosModel.minKm.toFixed(1)} &rarr; {tilosModel.maxKm.toFixed(1)} ({tilosModel.totalKm.toFixed(1)} km)</span>
          </div>

          {/* Zoom In / Out */}
          <div className="flex items-center border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.2))}
              disabled={zoomLevel <= 0.75}
              title="Zoom Out Chainage & Time"
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.2))}
              disabled={zoomLevel >= 2.0}
              title="Zoom In Chainage & Time"
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Discipline Legend Bar */}
      <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-[11px]">
        <span className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
          Work Disciplines:
        </span>
        {Object.entries(DISCIPLINE_COLORS).map(([name, color]) => (
          <button
            key={name}
            onClick={() => setSelectedDiscipline(selectedDiscipline === name ? 'ALL' : name)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all text-[11px] font-medium border ${
              selectedDiscipline === name
                ? 'ring-2 ring-amber-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border-transparent'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span>{name}</span>
          </button>
        ))}
        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold ml-auto">
          <span className="w-4 h-0.5 bg-rose-500 rounded" />
          <span>Critical Path</span>
        </div>
      </div>

      {/* 3. Main Split View: Left Time Axis + Center TILOS Canvas */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Frozen Time (Month) Column */}
        <div className="w-28 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-col z-20 select-none shadow-xs">
          {/* Top Left Corner: Time vs Distance Label */}
          <div className="h-16 border-b border-slate-200 dark:border-slate-800 p-2 flex flex-col justify-center items-center text-center bg-slate-100 dark:bg-slate-900">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              TIME (Y) &darr;
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              CHAINAGE (X) &rarr;
            </span>
          </div>

          {/* Monthly Rows on Left Axis */}
          <div className="flex-1 overflow-hidden relative">
            {monthTicks.map((tick, i) => {
              const y = getY(tick.timeMs);
              const nextY = i < monthTicks.length - 1 ? getY(monthTicks[i + 1].timeMs) : chartHeight;
              const rowH = Math.max(28, nextY - y);

              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: `${y}px`,
                    height: `${rowH}px`,
                    width: '100%',
                  }}
                  className="border-b border-slate-200 dark:border-slate-800/80 px-2 flex flex-col justify-center text-center font-mono"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {tick.label}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                    {tick.yearLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center / Right Scrollable Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950 relative"
          onMouseMove={(e) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setTooltipPos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
          }}
        >
          <div
            style={{ width: `${chartWidth}px`, height: `${chartHeight + 64}px` }}
            className="relative select-none"
          >
            {/* Sticky Header: Level 3 WBS Package Corridor Strip + Chainage Ruler */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 shadow-sm">
              {/* Level 3 WBS Sections Strip */}
              <div className="h-8 relative border-b border-slate-200 dark:border-slate-800 overflow-hidden">
                {tilosModel.sections.map((sec) => {
                  const x = getX(sec.startKm);
                  const endX = getX(sec.endKm);
                  const width = Math.max(30, endX - x);

                  return (
                    <div
                      key={sec.wbsId}
                      style={{
                        position: 'absolute',
                        left: `${x}px`,
                        width: `${width}px`,
                        backgroundColor: sec.color,
                      }}
                      title={`${sec.wbsCode}: ${sec.wbsName} (KM ${sec.startKm} to ${sec.endKm})`}
                      className="h-full border-r border-white/40 dark:border-slate-800 px-2 flex items-center justify-between text-[11px] font-semibold text-white truncate shadow-xs cursor-pointer transition-opacity hover:opacity-90"
                      onClick={() => setSelectedSectionId(sec.wbsId)}
                    >
                      <span className="truncate font-mono">{sec.wbsCode}</span>
                      <span className="text-[10px] opacity-90 truncate ml-1 hidden sm:inline">
                        {sec.wbsName}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chainage Ruler Strip */}
              <div className="h-8 relative flex items-center font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/80">
                {chainageTicks.map((tick, i) => (
                  <div
                    key={i}
                    style={{ position: 'absolute', left: `${tick.x}px` }}
                    className="flex flex-col items-start -translate-x-1/2"
                  >
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {tick.label}
                    </span>
                    <div className="w-[1px] h-2 bg-slate-400 dark:bg-slate-600 mt-0.5" />
                  </div>
                ))}
              </div>
            </div>

            {/* Background Monthly Grid Lines & Vertical Chainage Grid */}
            <div
              style={{
                position: 'absolute',
                top: '64px',
                left: 0,
                width: `${chartWidth}px`,
                height: `${chartHeight}px`,
              }}
              className="pointer-events-none"
            >
              {/* Horizontal Monthly Gridlines */}
              {monthTicks.map((tick, i) => {
                const y = getY(tick.timeMs);
                return (
                  <div
                    key={i}
                    style={{ top: `${y}px` }}
                    className="absolute inset-x-0 border-b border-slate-200 dark:border-slate-800/60"
                  />
                );
              })}

              {/* Vertical Chainage Gridlines */}
              {chainageTicks.map((tick, i) => (
                <div
                  key={i}
                  style={{ left: `${tick.x}px` }}
                  className="absolute inset-y-0 border-r border-slate-200/60 dark:border-slate-800/30"
                />
              ))}

              {/* Data Date Line (Horizontal Red Dashed) */}
              {dataDateY !== null && (
                <div
                  style={{ top: `${dataDateY}px` }}
                  className="absolute inset-x-0 border-b-2 border-dashed border-rose-500 z-10"
                >
                  <span className="sticky left-4 -top-3 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-mono font-bold shadow-sm whitespace-nowrap">
                    Data Date: {project.metadata.dataDate}
                  </span>
                </div>
              )}
            </div>

            {/* SVG Vectors Layer (Linear Production Lines & Point Activities) */}
            <svg
              style={{
                position: 'absolute',
                top: '64px',
                left: 0,
                width: `${chartWidth}px`,
                height: `${chartHeight}px`,
              }}
              className="overflow-visible"
            >
              <defs>
                <filter id="vector-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#F43F5E" floodOpacity="0.6" />
                </filter>
              </defs>

              {filteredVectors.map((vec) => {
                const startX = getX(vec.startKm);
                const endX = getX(vec.endKm);
                const startY = getY(vec.startTimeMs);
                const endY = getY(vec.finishTimeMs);
                const isSelected = vec.activity.id === selectedActivityId;
                const isHovered = hoveredVector?.activity.id === vec.activity.id;

                if (vec.isPoint || Math.abs(endX - startX) < 4) {
                  // Point Activity (Station, Bridge, Milestone)
                  const pX = startX;
                  const barH = Math.max(12, endY - startY);

                  return (
                    <g
                      key={vec.activity.id}
                      onClick={() => onSelectActivity(vec.activity)}
                      onMouseEnter={() => setHoveredVector(vec)}
                      onMouseLeave={() => setHoveredVector(null)}
                      className="cursor-pointer transition-transform hover:scale-105"
                    >
                      {/* Vertical corridor block */}
                      <rect
                        x={pX - 6}
                        y={startY}
                        width={12}
                        height={barH}
                        rx={3}
                        fill={vec.disciplineColor}
                        fillOpacity={isHovered || isSelected ? 0.95 : 0.75}
                        stroke={vec.isCritical ? '#F43F5E' : '#334155'}
                        strokeWidth={vec.isCritical ? 2 : 1}
                        filter={vec.isCritical ? 'url(#vector-glow)' : undefined}
                      />
                      {/* Label if height permits */}
                      <text
                        x={pX + 10}
                        y={startY + 12}
                        className="text-[10px] font-mono fill-slate-700 dark:fill-slate-300 font-semibold pointer-events-none select-none"
                      >
                        {vec.activity.code}
                      </text>
                    </g>
                  );
                }

                // Linear Vector Line (Angled slope)
                const strokeWidth = vec.isCritical ? 3.5 : isHovered || isSelected ? 3.5 : 2.25;
                const strokeColor = vec.isCritical ? '#F43F5E' : vec.disciplineColor;

                // Midpoint for text label
                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;

                return (
                  <g
                    key={vec.activity.id}
                    onClick={() => onSelectActivity(vec.activity)}
                    onMouseEnter={() => setHoveredVector(vec)}
                    onMouseLeave={() => setHoveredVector(null)}
                    className="cursor-pointer transition-all"
                  >
                    {/* Wider transparent hit-area path for easy hovering */}
                    <line
                      x1={startX}
                      y1={startY}
                      x2={endX}
                      y2={endY}
                      stroke="transparent"
                      strokeWidth={16}
                    />

                    {/* Actual visible vector line */}
                    <line
                      x1={startX}
                      y1={startY}
                      x2={endX}
                      y2={endY}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      opacity={isHovered || isSelected ? 1 : 0.85}
                      filter={vec.isCritical ? 'url(#vector-glow)' : undefined}
                    />

                    {/* Start Endpoint Circle */}
                    <circle
                      cx={startX}
                      cy={startY}
                      r={isHovered || isSelected ? 4.5 : 3}
                      fill={strokeColor}
                    />

                    {/* Finish Endpoint Circle */}
                    <circle
                      cx={endX}
                      cy={endY}
                      r={isHovered || isSelected ? 4.5 : 3}
                      fill={strokeColor}
                    />

                    {/* Label along vector */}
                    <text
                      x={midX}
                      y={midY - 5}
                      textAnchor="middle"
                      className="text-[10px] font-mono fill-slate-800 dark:fill-slate-200 font-bold pointer-events-none select-none drop-shadow-sm"
                    >
                      {vec.activity.code}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 4. Floating Study Tooltip */}
          {hoveredVector && tooltipPos && (
            <div
              style={{
                position: 'absolute',
                left: `${Math.min(window.innerWidth - 340, tooltipPos.x + 16)}px`,
                top: `${tooltipPos.y + 16}px`,
              }}
              className="z-50 pointer-events-none w-80 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-3.5 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-400 font-bold">
                    {hoveredVector.activity.code}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                    style={{ backgroundColor: hoveredVector.disciplineColor }}
                  >
                    {hoveredVector.discipline}
                  </span>
                </div>
                {hoveredVector.isCritical && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">
                    Critical Path
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-slate-100 text-xs">
                  {hoveredVector.activity.name}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  WBS L3: {hoveredVector.level3WbsCode} - {hoveredVector.level3WbsName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] border-t border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">Chainage Span</span>
                  <span className="text-slate-200 font-bold">
                    KM {hoveredVector.startKm} &rarr; {hoveredVector.endKm}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Distance Span</span>
                  <span className="text-slate-200 font-bold">
                    {Math.abs(hoveredVector.endKm - hoveredVector.startKm).toFixed(1)} km
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Planned Dates</span>
                  <span className="text-slate-200 font-bold">
                    {hoveredVector.startDate} &rarr; {hoveredVector.finishDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Duration</span>
                  <span className="text-slate-200 font-bold">
                    {hoveredVector.durationDays} days
                  </span>
                </div>
                {hoveredVector.advanceRateMetersPerMonth && (
                  <div className="col-span-2 bg-slate-800/80 p-1.5 rounded flex items-center justify-between text-amber-300 font-bold text-[11px]">
                    <span>Advance / Production Rate:</span>
                    <span>{hoveredVector.advanceRateMetersPerMonth.toLocaleString()} m/month</span>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-slate-400 italic pt-1">
                Click vector to open complete Activity Detail Inspector &rarr;
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Footer Stats Strip */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span>
            Showing <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{filteredVectors.length}</span> of{' '}
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{tilosModel.vectors.length}</span> vectors
          </span>
          <span>·</span>
          <span>
            Total Alignment: <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{tilosModel.totalKm.toFixed(1)} KM</span>
          </span>
          <span>·</span>
          <span>
            Level 3 WBS Sections: <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{tilosModel.sections.length}</span>
          </span>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-2">
          <span>Vectors slope indicates advance rate (speed). Intersecting vectors visually highlight site clashes.</span>
        </div>
      </div>
    </div>
  );
};
