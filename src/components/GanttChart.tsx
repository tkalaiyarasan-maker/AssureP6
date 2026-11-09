import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Activity, ParsedProject } from '../types/xer';
import {
  Search,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Flame,
  Route,
  Layers,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface GanttChartProps {
  project: ParsedProject;
  onSelectActivity: (activity: Activity) => void;
  selectedActivityId?: string;
}

export type TimeScale = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type GanttFilterMode = 'all' | 'critical' | 'longest';

export const GanttChart: React.FC<GanttChartProps> = ({
  project,
  onSelectActivity,
  selectedActivityId,
}) => {
  const [timeScale, setTimeScale] = useState<TimeScale>('month');
  const [filterMode, setFilterMode] = useState<GanttFilterMode>('all');
  const [showLogicLinks, setShowLogicLinks] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);

  // Virtualization windowing scroll offsets
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(600);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef<boolean>(false);

  // Measure container height on resize
  useEffect(() => {
    const updateSize = () => {
      if (timelineScrollRef.current) {
        setContainerHeight(timelineScrollRef.current.clientHeight);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return project.activities.filter((act) => {
      if (filterMode === 'critical' && !act.isCritical) return false;
      if (filterMode === 'longest' && !act.isLongestPath) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = act.code.toLowerCase().includes(q);
        const matchesName = act.name.toLowerCase().includes(q);
        const matchesWbs = act.wbsName.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesWbs) return false;
      }
      return true;
    });
  }, [project.activities, filterMode, searchQuery]);

  const longestPathCount = useMemo(() => {
    return project.activities.filter((a) => a.isLongestPath).length;
  }, [project.activities]);

  // Determine timeline boundary
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    let minDate = project.metadata.planStartDate || '2024-01-01';
    let maxDate = project.metadata.planFinishDate || '2025-12-31';

    for (const act of project.activities) {
      if (act.startDate && act.startDate < minDate) minDate = act.startDate;
      if (act.finishDate && act.finishDate > maxDate) maxDate = act.finishDate;
    }

    const start = new Date(minDate);
    start.setDate(start.getDate() - 10);

    const end = new Date(maxDate);
    end.setDate(end.getDate() + 25);

    const diffDays = Math.max(30, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: diffDays,
    };
  }, [project]);

  // Width per day depending on zoom level (Day -> Week -> Month -> Quarter -> Year)
  const pxPerDay = useMemo(() => {
    switch (timeScale) {
      case 'day':
        return 32;
      case 'week':
        return 12;
      case 'month':
        return 5.5;
      case 'quarter':
        return 2.2;
      case 'year':
        return 0.75;
    }
  }, [timeScale]);

  const timelineWidth = Math.max(900, totalDays * pxPerDay);
  const rowHeight = 36;

  // Zoom cycling helper
  const zoomLevels: TimeScale[] = ['day', 'week', 'month', 'quarter', 'year'];
  const handleZoomIn = () => {
    const idx = zoomLevels.indexOf(timeScale);
    if (idx > 0) setTimeScale(zoomLevels[idx - 1]);
  };
  const handleZoomOut = () => {
    const idx = zoomLevels.indexOf(timeScale);
    if (idx < zoomLevels.length - 1) setTimeScale(zoomLevels[idx + 1]);
  };

  // Convert date to X coordinate
  const getXCoordinate = useCallback(
    (dateStr?: string): number => {
      if (!dateStr) return 0;
      const d = new Date(dateStr);
      const diffDays = (d.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
      return Math.max(0, diffDays * pxPerDay);
    },
    [timelineStart, pxPerDay]
  );

  // Generate timeline ticks (Years, Quarters, Months, Weeks, Days)
  const timelineTicks = useMemo(() => {
    const ticks: { label: string; subLabel?: string; x: number; width: number }[] = [];
    const current = new Date(timelineStart);

    if (timeScale === 'year') {
      while (current <= timelineEnd) {
        const year = current.getFullYear();
        const yStart = new Date(year, 0, 1);
        const yEnd = new Date(year + 1, 0, 1);
        const x = getXCoordinate(yStart.toISOString().split('T')[0]);
        const nextX = getXCoordinate(yEnd.toISOString().split('T')[0]);
        ticks.push({
          label: String(year),
          x,
          width: Math.max(40, nextX - x),
        });
        current.setFullYear(year + 1);
        current.setMonth(0);
        current.setDate(1);
      }
    } else if (timeScale === 'quarter') {
      while (current <= timelineEnd) {
        const year = current.getFullYear();
        const quarter = Math.floor(current.getMonth() / 3) + 1;
        const qStart = new Date(year, (quarter - 1) * 3, 1);
        const qEnd = new Date(year, quarter * 3, 1);
        const x = getXCoordinate(qStart.toISOString().split('T')[0]);
        const nextX = getXCoordinate(qEnd.toISOString().split('T')[0]);
        ticks.push({
          label: `Q${quarter} ${year}`,
          x,
          width: Math.max(30, nextX - x),
        });
        current.setMonth(current.getMonth() + 3);
      }
    } else if (timeScale === 'month') {
      while (current <= timelineEnd) {
        const monthName = current.toLocaleString('default', { month: 'short' });
        const year = current.getFullYear();
        const mStart = new Date(current);
        current.setMonth(current.getMonth() + 1);
        current.setDate(1);
        const x = getXCoordinate(mStart.toISOString().split('T')[0]);
        const nextX = getXCoordinate(current.toISOString().split('T')[0]);
        ticks.push({
          label: `${monthName} '${String(year).slice(-2)}`,
          x,
          width: Math.max(25, nextX - x),
        });
      }
    } else if (timeScale === 'week') {
      while (current <= timelineEnd) {
        const monthName = current.toLocaleString('default', { month: 'short' });
        const day = current.getDate();
        const wStart = new Date(current);
        current.setDate(current.getDate() + 7);
        const x = getXCoordinate(wStart.toISOString().split('T')[0]);
        const nextX = getXCoordinate(current.toISOString().split('T')[0]);
        ticks.push({
          label: `${day} ${monthName}`,
          x,
          width: Math.max(30, nextX - x),
        });
      }
    } else {
      // Day scale
      const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      while (current <= timelineEnd) {
        const day = current.getDate();
        const dayOfWeek = dayNames[current.getDay()];
        const monthName = current.toLocaleString('default', { month: 'short' });
        const dStart = new Date(current);
        current.setDate(current.getDate() + 1);
        const x = getXCoordinate(dStart.toISOString().split('T')[0]);
        const nextX = getXCoordinate(current.toISOString().split('T')[0]);
        ticks.push({
          label: `${day}`,
          subLabel: `${dayOfWeek} (${monthName})`,
          x,
          width: Math.max(28, nextX - x),
        });
      }
    }

    return ticks;
  }, [timelineStart, timelineEnd, timeScale, getXCoordinate]);

  // Data date line
  const dataDateX = project.metadata.dataDate ? getXCoordinate(project.metadata.dataDate) : null;

  // Fast map from activity id to index in filtered activities
  const actIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < filteredActivities.length; i++) {
      map.set(filteredActivities[i].id, i);
    }
    return map;
  }, [filteredActivities]);

  // Synchronized scrolling between Table and Timeline
  const handleScroll = (e: React.UIEvent<HTMLDivElement>, source: 'table' | 'timeline') => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    const targetScrollTop = e.currentTarget.scrollTop;
    setScrollTop(targetScrollTop);

    if (source === 'timeline' && tableScrollRef.current) {
      tableScrollRef.current.scrollTop = targetScrollTop;
    } else if (source === 'table' && timelineScrollRef.current) {
      timelineScrollRef.current.scrollTop = targetScrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  // Virtual Windowing calculations for rows (rendering only visible rows + buffer)
  const bufferCount = 12;
  const totalCount = filteredActivities.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferCount);
  const endIndex = Math.min(totalCount, Math.ceil((scrollTop + containerHeight) / rowHeight) + bufferCount);

  const visibleActivities = useMemo(() => {
    return filteredActivities.slice(startIndex, endIndex);
  }, [filteredActivities, startIndex, endIndex]);

  const topPadding = startIndex * rowHeight;
  const bottomPadding = Math.max(0, (totalCount - endIndex) * rowHeight);

  // SVG Logic links: Only compute connections where either the target or source is in or near the visible window
  const visibleLogicPaths = useMemo(() => {
    if (!showLogicLinks || visibleActivities.length === 0) return [];

    const visibleIds = new Set(visibleActivities.map((a) => a.id));
    const paths: {
      id: string;
      d: string;
      isCritical: boolean;
      isLongest: boolean;
      sourceId: string;
      targetId: string;
    }[] = [];

    // Limit to max 120 links for peak UI responsiveness
    let linkCount = 0;
    for (const act of visibleActivities) {
      if (linkCount > 120) break;
      const toIdx = actIndexMap.get(act.id);
      if (toIdx === undefined) continue;

      for (const pred of act.predecessors) {
        const fromIdx = actIndexMap.get(pred.predTaskId);
        if (fromIdx === undefined) continue;

        // Skip if both nodes are far off screen
        if (Math.abs(toIdx - fromIdx) > 50 && !visibleIds.has(pred.predTaskId)) continue;

        const predAct = project.activities.find((a) => a.id === pred.predTaskId);
        if (!predAct) continue;

        const fromStartX = getXCoordinate(predAct.startDate);
        const fromEndX = Math.max(fromStartX + 12, getXCoordinate(predAct.finishDate));
        const fromY = fromIdx * rowHeight + rowHeight / 2;

        const toStartX = getXCoordinate(act.startDate);
        const toY = toIdx * rowHeight + rowHeight / 2;

        const isBothCritical = act.isCritical && predAct.isCritical && pred.driving;
        const isBothLongest = act.isLongestPath && predAct.isLongestPath && pred.driving;

        let pathD = '';
        if (pred.type === 'PR_FS') {
          const midX = fromEndX + 8;
          pathD = `M ${fromEndX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toStartX} ${toY}`;
        } else if (pred.type === 'PR_SS') {
          const midX = Math.min(fromStartX, toStartX) - 8;
          pathD = `M ${fromStartX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toStartX} ${toY}`;
        } else {
          pathD = `M ${fromEndX} ${fromY} C ${fromEndX + 15} ${fromY}, ${toStartX - 15} ${toY}, ${toStartX} ${toY}`;
        }

        paths.push({
          id: `${pred.id}_${act.id}`,
          d: pathD,
          isCritical: !!isBothCritical,
          isLongest: !!isBothLongest,
          sourceId: predAct.id,
          targetId: act.id,
        });

        linkCount++;
      }
    }
    return paths;
  }, [showLogicLinks, visibleActivities, actIndexMap, project.activities, getXCoordinate]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg transition-colors">
      {/* Gantt Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, Name or WBS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-52 text-xs"
            />
          </div>

          {/* Filter Mode Buttons (All / Critical Path / Longest Path) */}
          <div className="flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({project.activities.length})
            </button>
            <button
              onClick={() => setFilterMode('critical')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                filterMode === 'critical'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              <Flame className="w-3 h-3 text-rose-300" />
              Critical ({project.stats.criticalCount})
            </button>
            <button
              onClick={() => setFilterMode('longest')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                filterMode === 'longest'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              <Route className="w-3 h-3 text-amber-700 dark:text-amber-300" />
              Longest Path ({longestPathCount})
            </button>
          </div>

          {/* Logic Links Toggle */}
          <button
            onClick={() => setShowLogicLinks(!showLogicLinks)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showLogicLinks
                ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                : 'bg-white dark:bg-slate-950 text-slate-500 border-slate-300 dark:border-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {showLogicLinks ? <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            Logic Ties
          </button>
        </div>

        {/* Primavera-Style Zoom Controls (Day, Week, Month, Quarter, Year) */}
        <div className="flex items-center gap-2">
          {/* Zoom In / Out Buttons */}
          <div className="flex items-center border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
            <button
              onClick={handleZoomIn}
              disabled={timeScale === 'day'}
              title="Zoom In (towards Day level)"
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-slate-200 dark:border-slate-800" />
            <button
              onClick={handleZoomOut}
              disabled={timeScale === 'year'}
              title="Zoom Out (towards Year level)"
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Direct 5-Level Segmented Zoom Picker */}
          <div className="flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg">
            {(['day', 'week', 'month', 'quarter', 'year'] as TimeScale[]).map((scale) => (
              <button
                key={scale}
                onClick={() => setTimeScale(scale)}
                className={`px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  timeScale === scale
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {scale}
              </button>
            ))}
          </div>

          {/* Quick Stats Pill */}
          <span className="hidden xl:inline text-[11px] font-mono text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
            {filteredActivities.length} Tasks
          </span>
        </div>
      </div>

      {/* Main Gantt Split View */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Frozen Table Columns */}
        <div className="w-[410px] lg:w-[480px] shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-950 z-10">
          {/* Header Row */}
          <div className="flex items-center h-12 px-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider select-none shrink-0 shadow-xs">
            <div className="w-24">Act ID</div>
            <div className="flex-1 px-2">Activity Name</div>
            <div className="w-14 text-right">Dur</div>
            <div className="w-16 text-right">Float</div>
            <div className="w-12 text-right">%</div>
          </div>

          {/* Virtualized Body Rows */}
          <div
            ref={tableScrollRef}
            onScroll={(e) => handleScroll(e, 'table')}
            className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40 font-mono text-xs select-none"
          >
            {/* Top Virtual Spacer */}
            <div style={{ height: `${topPadding}px` }} />

            {visibleActivities.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-sans">
                No activities match the current filters.
              </div>
            ) : (
              visibleActivities.map((act) => {
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
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'
                        : isHovered
                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100'
                        : 'text-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    {/* Activity Code */}
                    <div className="w-24 truncate font-semibold text-amber-700 dark:text-amber-400">
                      {act.code}
                    </div>

                    {/* Activity Name + Badges */}
                    <div className="flex-1 px-2 truncate font-sans text-xs flex items-center gap-1.5">
                      {act.isLongestPath && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                          title="Longest Driving Path"
                        />
                      )}
                      {act.isCritical && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"
                          title="Critical Path (Total Float <= 0)"
                        />
                      )}
                      <span className="truncate text-slate-900 dark:text-slate-100 font-medium">
                        {act.name}
                      </span>
                    </div>

                    {/* Duration in Days */}
                    <div className="w-14 text-right tabular-nums text-slate-600 dark:text-slate-400 text-[11px]">
                      {act.origDurationDays}d
                    </div>

                    {/* Total Float */}
                    <div
                      className={`w-16 text-right tabular-nums text-[11px] ${
                        act.totalFloatDays <= 0
                          ? 'text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {act.totalFloatDays}d
                    </div>

                    {/* Progress % */}
                    <div className="w-12 text-right tabular-nums text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                      {act.physCompletePct}%
                    </div>
                  </div>
                );
              })
            )}

            {/* Bottom Virtual Spacer */}
            <div style={{ height: `${bottomPadding}px` }} />
          </div>
        </div>

        {/* Right Scrollable Timeline Canvas */}
        <div
          ref={timelineScrollRef}
          onScroll={(e) => handleScroll(e, 'timeline')}
          className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950 relative"
        >
          <div style={{ width: `${timelineWidth}px` }} className="relative select-none min-h-full">
            {/* Timeline Header (Sticky Top) */}
            <div className="sticky top-0 z-20 flex h-12 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 backdrop-blur-sm shadow-xs">
              {timelineTicks.map((tick, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${tick.x}px`,
                    width: `${tick.width}px`,
                  }}
                  className="h-full border-r border-slate-200 dark:border-slate-800 px-2 flex flex-col justify-center text-xs text-slate-700 dark:text-slate-300 font-semibold truncate"
                >
                  <span className="truncate">{tick.label}</span>
                  {tick.subLabel && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate">
                      {tick.subLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Vertical Grid Lines Background */}
            <div
              style={{ height: `${filteredActivities.length * rowHeight}px` }}
              className="absolute inset-x-0 pointer-events-none top-12"
            >
              {timelineTicks.map((tick, i) => (
                <div
                  key={i}
                  style={{ left: `${tick.x}px` }}
                  className="absolute top-0 bottom-0 border-r border-slate-200/60 dark:border-slate-800/40"
                />
              ))}

              {/* Data Date Line */}
              {dataDateX !== null && (
                <div
                  style={{ left: `${dataDateX}px` }}
                  className="absolute top-0 bottom-0 border-r-2 border-dashed border-rose-500 z-10"
                >
                  <span className="sticky top-2 left-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-mono whitespace-nowrap font-bold shadow-sm">
                    Data Date: {project.metadata.dataDate}
                  </span>
                </div>
              )}
            </div>

            {/* SVG Logic Connection Lines (Visible window only) */}
            {showLogicLinks && visibleLogicPaths.length > 0 && (
              <svg
                style={{
                  width: `${timelineWidth}px`,
                  height: `${filteredActivities.length * rowHeight}px`,
                }}
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
                  <marker
                    id="arrow-longest"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F59E0B" />
                  </marker>
                </defs>

                {visibleLogicPaths.map((pathItem) => {
                  const strokeColor = pathItem.isLongest
                    ? '#F59E0B'
                    : pathItem.isCritical
                    ? '#F43F5E'
                    : '#64748B';
                  const marker = pathItem.isLongest
                    ? 'url(#arrow-longest)'
                    : pathItem.isCritical
                    ? 'url(#arrow-crit)'
                    : 'url(#arrow-std)';

                  return (
                    <path
                      key={pathItem.id}
                      d={pathItem.d}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={pathItem.isLongest ? 2 : pathItem.isCritical ? 1.75 : 1}
                      markerEnd={marker}
                      opacity={
                        hoveredActivityId &&
                        (hoveredActivityId === pathItem.sourceId ||
                          hoveredActivityId === pathItem.targetId)
                          ? 1
                          : 0.65
                      }
                    />
                  );
                })}
              </svg>
            )}

            {/* Virtualized Gantt Bars Container */}
            <div
              style={{
                paddingTop: `${topPadding}px`,
                paddingBottom: `${bottomPadding}px`,
              }}
              className="relative top-12"
            >
              {visibleActivities.map((act) => {
                const startX = getXCoordinate(act.startDate);
                const finishX = getXCoordinate(act.finishDate);
                const width = Math.max(12, finishX - startX);
                const isMilestone =
                  act.type === 'TT_Mile' ||
                  act.type === 'TT_FinMile' ||
                  act.origDurationDays === 0;
                const isSelected = act.id === selectedActivityId;
                const isHovered = act.id === hoveredActivityId;

                const lateFinishX = act.lateFinishDate
                  ? getXCoordinate(act.lateFinishDate)
                  : finishX;
                const floatWidth = Math.max(0, lateFinishX - finishX);

                return (
                  <div
                    key={act.id}
                    style={{ height: `${rowHeight}px` }}
                    className={`relative flex items-center border-b border-slate-200/50 dark:border-slate-800/30 transition-colors ${
                      isSelected
                        ? 'bg-amber-500/10'
                        : isHovered
                        ? 'bg-slate-200/30 dark:bg-slate-800/30'
                        : ''
                    }`}
                    onMouseEnter={() => setHoveredActivityId(act.id)}
                    onMouseLeave={() => setHoveredActivityId(null)}
                    onClick={() => onSelectActivity(act)}
                  >
                    {/* Total Float extension dotted line */}
                    {floatWidth > 0 && (
                      <div
                        style={{
                          left: `${finishX}px`,
                          width: `${floatWidth}px`,
                        }}
                        className="absolute h-1.5 border-b-2 border-dotted border-slate-400 dark:border-slate-600 top-1/2 -translate-y-1/2 pointer-events-none"
                      />
                    )}

                    {/* Milestone Diamond */}
                    {isMilestone ? (
                      <div
                        style={{ left: `${startX - 8}px` }}
                        className={`absolute w-4 h-4 rotate-45 cursor-pointer z-10 transition-transform ${
                          act.isLongestPath
                            ? 'bg-amber-500 ring-2 ring-amber-300 shadow-md'
                            : act.isCritical
                            ? 'bg-rose-500 ring-2 ring-rose-400 shadow-md'
                            : 'bg-sky-500 ring-2 ring-sky-300 shadow-sm'
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
                        className={`absolute h-5 rounded cursor-pointer z-10 overflow-hidden flex items-center transition-all ${
                          act.isLongestPath
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 border border-amber-400 shadow-xs'
                            : act.isCritical
                            ? 'bg-rose-600 border border-rose-500 shadow-xs'
                            : 'bg-sky-600 border border-sky-500 shadow-xs'
                        } ${isSelected ? 'ring-2 ring-amber-400 scale-[1.02]' : ''}`}
                      >
                        {/* Progress fill */}
                        {act.physCompletePct > 0 && (
                          <div
                            style={{
                              width: `${Math.min(100, act.physCompletePct)}%`,
                            }}
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

                    {/* Text Label to the right of the bar */}
                    <div
                      style={{
                        left: `${
                          isMilestone
                            ? startX + 16
                            : Math.max(finishX + 8, startX + width + 8)
                        }px`,
                      }}
                      className="absolute text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap pointer-events-none flex items-center gap-2"
                    >
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">
                        {act.code}
                      </span>
                      {act.assignments.length > 0 && (
                        <span className="text-[10px] text-slate-500 font-sans hidden sm:inline">
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
