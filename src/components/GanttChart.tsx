import React, { useState, useMemo, useRef } from 'react';
import { Activity, ParsedProject, Relationship } from '../types/xer';
import {
  Calendar as CalendarIcon,
  Filter,
  Search,
  Eye,
  EyeOff,
  GitCommit,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertCircle,
} from 'lucide-react';

interface GanttChartProps {
  project: ParsedProject;
  onSelectActivity: (activity: Activity) => void;
  selectedActivityId?: string;
}

type TimeScale = 'week' | 'month' | 'quarter';

export const GanttChart: React.FC<GanttChartProps> = ({
  project,
  onSelectActivity,
  selectedActivityId,
}) => {
  const [timeScale, setTimeScale] = useState<TimeScale>('month');
  const [showLogicLinks, setShowLogicLinks] = useState<boolean>(true);
  const [onlyCritical, setOnlyCritical] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return project.activities.filter((act) => {
      if (onlyCritical && !act.isCritical) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = act.code.toLowerCase().includes(q);
        const matchesName = act.name.toLowerCase().includes(q);
        const matchesWbs = act.wbsName.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesWbs) return false;
      }
      return true;
    });
  }, [project.activities, onlyCritical, searchQuery]);

  // Determine timeline boundary
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    let minDate = project.metadata.planStartDate || '2024-01-01';
    let maxDate = project.metadata.planFinishDate || '2025-12-31';

    for (const act of project.activities) {
      if (act.startDate && act.startDate < minDate) minDate = act.startDate;
      if (act.finishDate && act.finishDate > maxDate) maxDate = act.finishDate;
    }

    const start = new Date(minDate);
    // Add 14 days buffer before
    start.setDate(start.getDate() - 14);

    const end = new Date(maxDate);
    // Add 30 days buffer after
    end.setDate(end.getDate() + 30);

    const diffDays = Math.max(30, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: diffDays,
    };
  }, [project]);

  // Width per day depending on zoom
  const pxPerDay = useMemo(() => {
    switch (timeScale) {
      case 'week':
        return 14;
      case 'month':
        return 6;
      case 'quarter':
        return 3;
    }
  }, [timeScale]);

  const timelineWidth = Math.max(800, totalDays * pxPerDay);
  const rowHeight = 38;

  // Convert date to X coordinate
  const getXCoordinate = (dateStr?: string): number => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const diffDays = (d.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, diffDays * pxPerDay);
  };

  // Generate timeline ticks
  const timelineTicks = useMemo(() => {
    const ticks: { label: string; subLabel?: string; x: number; width: number }[] = [];
    const current = new Date(timelineStart);

    if (timeScale === 'quarter') {
      // Quarter blocks
      while (current <= timelineEnd) {
        const year = current.getFullYear();
        const quarter = Math.floor(current.getMonth() / 3) + 1;
        const qStart = new Date(current);
        // Advance 3 months
        current.setMonth(current.getMonth() + 3);
        const x = getXCoordinate(qStart.toISOString().split('T')[0]);
        const nextX = getXCoordinate(current.toISOString().split('T')[0]);
        ticks.push({
          label: `Q${quarter} ${year}`,
          x,
          width: nextX - x,
        });
      }
    } else if (timeScale === 'month') {
      // Month blocks
      while (current <= timelineEnd) {
        const monthName = current.toLocaleString('default', { month: 'short' });
        const year = current.getFullYear();
        const mStart = new Date(current);
        current.setMonth(current.getMonth() + 1);
        current.setDate(1);
        const x = getXCoordinate(mStart.toISOString().split('T')[0]);
        const nextX = getXCoordinate(current.toISOString().split('T')[0]);
        ticks.push({
          label: `${monthName} ${year}`,
          x,
          width: nextX - x,
        });
      }
    } else {
      // Week blocks
      while (current <= timelineEnd) {
        const monthName = current.toLocaleString('default', { month: 'short' });
        const day = current.getDate();
        const wStart = new Date(current);
        current.setDate(current.getDate() + 7);
        const x = getXCoordinate(wStart.toISOString().split('T')[0]);
        const nextX = getXCoordinate(current.toISOString().split('T')[0]);
        ticks.push({
          label: `Wk ${day} ${monthName}`,
          x,
          width: nextX - x,
        });
      }
    }

    return ticks;
  }, [timelineStart, timelineEnd, timeScale, pxPerDay]);

  // Data date line
  const dataDateX = project.metadata.dataDate ? getXCoordinate(project.metadata.dataDate) : null;

  // Map activity ID to its row index
  const actIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    filteredActivities.forEach((act, idx) => {
      map.set(act.id, idx);
    });
    return map;
  }, [filteredActivities]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Gantt Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Activity ID or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-56 text-xs"
            />
          </div>

          {/* Critical Path Toggle */}
          <button
            onClick={() => setOnlyCritical(!onlyCritical)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              onlyCritical
                ? 'bg-rose-950/80 text-rose-300 border-rose-800 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Critical Path Only ({project.stats.criticalCount})
          </button>

          {/* Logic Links Toggle */}
          <button
            onClick={() => setShowLogicLinks(!showLogicLinks)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              showLogicLinks
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            {showLogicLinks ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            Logic Links
          </button>
        </div>

        {/* Zoom & Info */}
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-rose-500" />
              <span>Critical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-sky-500" />
              <span>Standard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rotate-45 bg-amber-400 inline-block" />
              <span>Milestone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-rose-400" />
              <span>Data Date</span>
            </div>
          </div>

          {/* Time Scale Zoom Segmented Buttons */}
          <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setTimeScale('week')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                timeScale === 'week' ? 'bg-slate-800 text-slate-100 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weeks
            </button>
            <button
              onClick={() => setTimeScale('month')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                timeScale === 'month' ? 'bg-slate-800 text-slate-100 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Months
            </button>
            <button
              onClick={() => setTimeScale('quarter')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                timeScale === 'quarter' ? 'bg-slate-800 text-slate-100 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Quarters
            </button>
          </div>
        </div>
      </div>

      {/* Main Gantt Split Screen */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Frozen Table Columns */}
        <div className="w-[380px] lg:w-[460px] shrink-0 border-r border-slate-800 flex flex-col bg-slate-950">
          {/* Header row */}
          <div
            className="flex items-center h-12 px-3 border-b border-slate-800 bg-slate-900/70 text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none shrink-0"
          >
            <div className="w-24">Act ID</div>
            <div className="flex-1 px-2">Activity Name</div>
            <div className="w-14 text-right">Dur</div>
            <div className="w-16 text-right">Float</div>
            <div className="w-14 text-right">%</div>
          </div>

          {/* Body Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 font-mono text-xs select-none">
            {filteredActivities.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-sans">
                No activities match the current filters.
              </div>
            ) : (
              filteredActivities.map((act) => {
                const isSelected = act.id === selectedActivityId;
                const isHovered = act.id === hoveredActivityId;

                return (
                  <div
                    key={act.id}
                    onClick={() => onSelectActivity(act)}
                    onMouseEnter={() => setHoveredActivityId(act.id)}
                    onMouseLeave={() => setHoveredActivityId(null)}
                    style={{ height: `${rowHeight}px` }}
                    className={`flex items-center px-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-500/15 text-amber-200'
                        : isHovered
                        ? 'bg-slate-800/40 text-slate-100'
                        : 'text-slate-300 hover:bg-slate-900/50'
                    }`}
                  >
                    {/* Activity Code */}
                    <div className="w-24 truncate font-semibold text-amber-400">
                      {act.code}
                    </div>

                    {/* Activity Name */}
                    <div className="flex-1 px-2 truncate font-sans text-xs flex items-center gap-1.5">
                      {act.isCritical && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Critical Task" />
                      )}
                      <span className="truncate">{act.name}</span>
                    </div>

                    {/* Duration in Days */}
                    <div className="w-14 text-right tabular-nums text-slate-400 text-[11px]">
                      {act.origDurationDays}d
                    </div>

                    {/* Total Float */}
                    <div
                      className={`w-16 text-right tabular-nums text-[11px] ${
                        act.totalFloatDays <= 0 ? 'text-rose-400 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {act.totalFloatDays}d
                    </div>

                    {/* Progress % */}
                    <div className="w-14 text-right tabular-nums text-[11px] text-emerald-400 font-medium">
                      {act.physCompletePct}%
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Scrollable Timeline Canvas */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-slate-950 relative">
          <div style={{ width: `${timelineWidth}px` }} className="relative select-none min-h-full">
            {/* Timeline Header */}
            <div className="sticky top-0 z-20 flex h-12 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm">
              {timelineTicks.map((tick, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${tick.x}px`,
                    width: `${tick.width}px`,
                  }}
                  className="h-full border-r border-slate-800/80 px-2 flex flex-col justify-center text-xs text-slate-400 font-medium truncate"
                >
                  <span>{tick.label}</span>
                </div>
              ))}
            </div>

            {/* Vertical Grid Lines */}
            <div className="absolute inset-0 pointer-events-none top-12">
              {timelineTicks.map((tick, i) => (
                <div
                  key={i}
                  style={{ left: `${tick.x}px` }}
                  className="absolute top-0 bottom-0 border-r border-slate-800/30"
                />
              ))}

              {/* Data Date Line */}
              {dataDateX !== null && (
                <div
                  style={{ left: `${dataDateX}px` }}
                  className="absolute top-0 bottom-0 border-r-2 border-dashed border-rose-500 z-10"
                >
                  <span className="absolute top-1 left-1.5 px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 text-[10px] font-mono whitespace-nowrap">
                    Data Date: {project.metadata.dataDate}
                  </span>
                </div>
              )}
            </div>

            {/* SVG Logic Connection Lines */}
            {showLogicLinks && (
              <svg
                style={{ width: `${timelineWidth}px`, height: `${filteredActivities.length * rowHeight}px` }}
                className="absolute top-12 left-0 pointer-events-none z-10"
              >
                <defs>
                  <marker
                    id="arrow-std"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748B" />
                  </marker>
                  <marker
                    id="arrow-crit"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F43F5E" />
                  </marker>
                </defs>

                {filteredActivities.flatMap((act) => {
                  const toIdx = actIndexMap.get(act.id);
                  if (toIdx === undefined) return [];

                  return act.predecessors
                    .map((pred) => {
                      const fromIdx = actIndexMap.get(pred.predTaskId);
                      if (fromIdx === undefined) return null;

                      const predAct = project.activities.find((a) => a.id === pred.predTaskId);
                      if (!predAct) return null;

                      // Source bar coordinates
                      const fromStartX = getXCoordinate(predAct.startDate);
                      const fromEndX = Math.max(fromStartX + 12, getXCoordinate(predAct.finishDate));
                      const fromY = fromIdx * rowHeight + rowHeight / 2;

                      // Target bar coordinates
                      const toStartX = getXCoordinate(act.startDate);
                      const toY = toIdx * rowHeight + rowHeight / 2;

                      // Critical path arrow
                      const isBothCritical = act.isCritical && predAct.isCritical && pred.driving;
                      const strokeColor = isBothCritical ? '#F43F5E' : '#475569';
                      const marker = isBothCritical ? 'url(#arrow-crit)' : 'url(#arrow-std)';

                      let pathD = '';
                      if (pred.type === 'PR_FS') {
                        // Finish to start
                        const midX = fromEndX + 10;
                        pathD = `M ${fromEndX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toStartX} ${toY}`;
                      } else if (pred.type === 'PR_SS') {
                        // Start to start
                        const midX = Math.min(fromStartX, toStartX) - 10;
                        pathD = `M ${fromStartX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toStartX} ${toY}`;
                      } else {
                        // General fallback
                        pathD = `M ${fromEndX} ${fromY} C ${fromEndX + 20} ${fromY}, ${toStartX - 20} ${toY}, ${toStartX} ${toY}`;
                      }

                      return (
                        <path
                          key={`${pred.id}_${act.id}`}
                          d={pathD}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={isBothCritical ? 1.75 : 1}
                          strokeDasharray={pred.type === 'PR_SS' ? '3,3' : 'none'}
                          markerEnd={marker}
                          opacity={hoveredActivityId && (hoveredActivityId === act.id || hoveredActivityId === predAct.id) ? 1 : 0.65}
                        />
                      );
                    })
                    .filter(Boolean);
                })}
              </svg>
            )}

            {/* Gantt Activity Bars */}
            <div className="relative top-12">
              {filteredActivities.map((act, index) => {
                const startX = getXCoordinate(act.startDate);
                const finishX = getXCoordinate(act.finishDate);
                const width = Math.max(12, finishX - startX);
                const isMilestone = act.type === 'TT_Mile' || act.type === 'TT_FinMile' || act.origDurationDays === 0;
                const isSelected = act.id === selectedActivityId;
                const isHovered = act.id === hoveredActivityId;

                // Total float line
                const lateFinishX = act.lateFinishDate ? getXCoordinate(act.lateFinishDate) : finishX;
                const floatWidth = Math.max(0, lateFinishX - finishX);

                return (
                  <div
                    key={act.id}
                    style={{ height: `${rowHeight}px` }}
                    className={`relative flex items-center border-b border-slate-800/30 transition-colors ${
                      isSelected
                        ? 'bg-amber-500/10'
                        : isHovered
                        ? 'bg-slate-800/20'
                        : ''
                    }`}
                    onMouseEnter={() => setHoveredActivityId(act.id)}
                    onMouseLeave={() => setHoveredActivityId(null)}
                    onClick={() => onSelectActivity(act)}
                  >
                    {/* Float bar extension (dotted) */}
                    {floatWidth > 0 && (
                      <div
                        style={{
                          left: `${finishX}px`,
                          width: `${floatWidth}px`,
                        }}
                        className="absolute h-1.5 border-b-2 border-dotted border-slate-600 top-1/2 -translate-y-1/2 pointer-events-none"
                      />
                    )}

                    {/* Milestone diamond */}
                    {isMilestone ? (
                      <div
                        style={{ left: `${startX - 8}px` }}
                        className={`absolute w-4 h-4 rotate-45 cursor-pointer z-10 transition-transform ${
                          act.isCritical
                            ? 'bg-rose-500 shadow-md shadow-rose-950 ring-2 ring-rose-400/40'
                            : 'bg-amber-400 shadow-md shadow-amber-950 ring-2 ring-amber-300/40'
                        } ${isHovered || isSelected ? 'scale-125' : ''}`}
                        title={`${act.code}: ${act.name} (${act.startDate})`}
                      />
                    ) : (
                      /* Activity Bar */
                      <div
                        style={{
                          left: `${startX}px`,
                          width: `${width}px`,
                        }}
                        className={`absolute h-6 rounded cursor-pointer z-10 overflow-hidden flex items-center transition-all ${
                          act.isCritical
                            ? 'bg-rose-600/90 border border-rose-500 shadow-sm shadow-rose-950'
                            : 'bg-sky-600/90 border border-sky-500 shadow-sm shadow-sky-950'
                        } ${isSelected ? 'ring-2 ring-amber-400 scale-[1.02]' : ''}`}
                      >
                        {/* Progress fill */}
                        {act.physCompletePct > 0 && (
                          <div
                            style={{ width: `${Math.min(100, act.physCompletePct)}%` }}
                            className="h-full bg-emerald-500/80 transition-all border-r border-emerald-400"
                          />
                        )}

                        {/* Label inside bar if wide enough */}
                        {width > 60 && (
                          <span className="absolute left-2 text-[10px] font-sans font-medium text-white truncate max-w-[calc(100%-12px)] drop-shadow">
                            {act.name}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Text label right of the bar */}
                    <div
                      style={{ left: `${isMilestone ? startX + 16 : Math.max(finishX + 8, startX + width + 8)}px` }}
                      className="absolute text-[11px] font-mono text-slate-400 whitespace-nowrap pointer-events-none flex items-center gap-2"
                    >
                      <span className="text-slate-300">{act.code}</span>
                      {act.assignments.length > 0 && (
                        <span className="text-[10px] text-slate-500 font-sans">
                          [{act.assignments.map((a) => a.resourceCode).join(', ')}]
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
