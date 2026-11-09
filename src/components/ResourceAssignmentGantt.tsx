import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Activity, ParsedProject, ResourceAssignment, Resource } from '../types/xer';
import {
  Search,
  Users,
  Wrench,
  Package,
  ChevronRight,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  FolderOpen,
  DollarSign,
  Clock,
  Filter,
} from 'lucide-react';
import { TimeScale } from './GanttChart';

interface ResourceAssignmentGanttProps {
  project: ParsedProject;
  onSelectActivity: (activity: Activity) => void;
  selectedActivityId?: string;
}

interface GroupedResource {
  resource: Resource;
  assignments: {
    assignment: ResourceAssignment;
    activity: Activity;
  }[];
  totalBudgetedUnits: number;
  totalActualUnits: number;
  totalRemainingUnits: number;
  totalCost: number;
}

export const ResourceAssignmentGantt: React.FC<ResourceAssignmentGanttProps> = ({
  project,
  onSelectActivity,
  selectedActivityId,
}) => {
  const [timeScale, setTimeScale] = useState<TimeScale>('month');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<'ALL' | 'RT_Labor' | 'RT_Nonlabor' | 'RT_Mat'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedResourceIds, setExpandedResourceIds] = useState<Set<string>>(() => {
    // Default: expand top 5 resources
    return new Set(project.resources.slice(0, 8).map((r) => r.id));
  });

  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Synchronized scrolling refs
  const tableRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef<boolean>(false);

  // Group activities and assignments by resource
  const groupedResources = useMemo(() => {
    const actMap = new Map<string, Activity>();
    for (const a of project.activities) {
      actMap.set(a.id, a);
    }

    const rMap = new Map<string, GroupedResource>();

    for (const r of project.resources) {
      rMap.set(r.id, {
        resource: r,
        assignments: [],
        totalBudgetedUnits: 0,
        totalActualUnits: 0,
        totalRemainingUnits: 0,
        totalCost: 0,
      });
    }

    // Iterate through activity assignments
    for (const act of project.activities) {
      for (const asgn of act.assignments) {
        const group = rMap.get(asgn.resourceId);
        if (group) {
          const remainUnits = Math.max(0, (asgn.targetUnits || 0) - (asgn.actUnits || 0));
          group.assignments.push({ assignment: asgn, activity: act });
          group.totalBudgetedUnits += asgn.targetUnits || 0;
          group.totalActualUnits += asgn.actUnits || 0;
          group.totalRemainingUnits += remainUnits;
          group.totalCost += asgn.targetCost || 0;
        }
      }
    }

    return Array.from(rMap.values());
  }, [project.resources, project.activities]);

  // Filter grouped resources
  const filteredGroups = useMemo(() => {
    return groupedResources.filter((group) => {
      if (resourceTypeFilter !== 'ALL' && group.resource.type !== resourceTypeFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const rMatch =
          group.resource.code.toLowerCase().includes(q) ||
          group.resource.name.toLowerCase().includes(q);
        const aMatch = group.assignments.some(
          (a) =>
            a.activity.code.toLowerCase().includes(q) ||
            a.activity.name.toLowerCase().includes(q)
        );
        if (!rMatch && !aMatch) return false;
      }

      return true;
    });
  }, [groupedResources, resourceTypeFilter, searchQuery]);

  // Expand / collapse helpers
  const toggleResource = (resourceId: string) => {
    setExpandedResourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(resourceId)) next.delete(resourceId);
      else next.add(resourceId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedResourceIds(new Set(filteredGroups.map((g) => g.resource.id)));
  };

  const collapseAll = () => {
    setExpandedResourceIds(new Set());
  };

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

  // Zoom pixels per day
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

  // Zoom helpers
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

  // Generate timeline ticks
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

  // Synchronized scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>, source: 'table' | 'timeline') => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    const targetScrollTop = e.currentTarget.scrollTop;

    if (source === 'timeline' && tableRef.current) {
      tableRef.current.scrollTop = targetScrollTop;
    } else if (source === 'table' && timelineRef.current) {
      timelineRef.current.scrollTop = targetScrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const dataDateX = project.metadata.dataDate ? getXCoordinate(project.metadata.dataDate) : null;

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'RT_Labor':
        return <Users className="w-3.5 h-3.5 text-blue-500" />;
      case 'RT_Nonlabor':
        return <Wrench className="w-3.5 h-3.5 text-amber-500" />;
      case 'RT_Mat':
        return <Package className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Users className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg transition-colors">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Resource or Activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-56 text-xs"
            />
          </div>

          {/* Resource Type Filter */}
          <div className="flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg">
            <button
              onClick={() => setResourceTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                resourceTypeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setResourceTypeFilter('RT_Labor')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                resourceTypeFilter === 'RT_Labor'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400'
              }`}
            >
              <Users className="w-3 h-3" />
              Labor
            </button>
            <button
              onClick={() => setResourceTypeFilter('RT_Nonlabor')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                resourceTypeFilter === 'RT_Nonlabor'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              <Wrench className="w-3 h-3" />
              Non-Labor
            </button>
            <button
              onClick={() => setResourceTypeFilter('RT_Mat')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                resourceTypeFilter === 'RT_Mat'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <Package className="w-3 h-3" />
              Material
            </button>
          </div>

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-1">
            <button
              onClick={expandAll}
              className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-800 rounded bg-white dark:bg-slate-900"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-800 rounded bg-white dark:bg-slate-900"
            >
              Collapse
            </button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
            <button
              onClick={handleZoomIn}
              disabled={timeScale === 'day'}
              title="Zoom In"
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-slate-200 dark:border-slate-800" />
            <button
              onClick={handleZoomOut}
              disabled={timeScale === 'year'}
              title="Zoom Out"
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

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

          <span className="hidden xl:inline text-[11px] font-mono text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
            {filteredGroups.length} Resources
          </span>
        </div>
      </div>

      {/* Main Split View: Left Spreadsheet + Right Gantt Timeline */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Frozen Resource Spreadsheet */}
        <div className="w-[500px] lg:w-[560px] shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-950 z-10">
          {/* Header Row */}
          <div className="flex items-center h-12 px-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider select-none shrink-0 shadow-xs">
            <div className="w-6" />
            <div className="w-28">Resource / Act ID</div>
            <div className="flex-1 px-2">Resource Name / Activity</div>
            <div className="w-20 text-right">Target Units</div>
            <div className="w-18 text-right">Actual</div>
            <div className="w-18 text-right">Remain</div>
          </div>

          {/* Body Rows */}
          <div
            ref={tableRef}
            onScroll={(e) => handleScroll(e, 'table')}
            className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40 font-mono text-xs select-none"
          >
            {filteredGroups.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-sans">
                No resources or assignments match your query.
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isExpanded = expandedResourceIds.has(group.resource.id);
                const hasAssignments = group.assignments.length > 0;

                return (
                  <React.Fragment key={group.resource.id}>
                    {/* Resource Parent Row */}
                    <div
                      style={{ height: `${rowHeight}px` }}
                      onClick={() => toggleResource(group.resource.id)}
                      onMouseEnter={() => setHoveredRowId(group.resource.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                      className={`flex items-center px-3 cursor-pointer transition-colors bg-slate-50/70 dark:bg-slate-900/60 font-semibold ${
                        hoveredRowId === group.resource.id
                          ? 'bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-white'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {/* Expand / Collapse Icon */}
                      <div className="w-6 flex items-center justify-center text-slate-500">
                        {hasAssignments && (
                          isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {/* Resource Code + Icon */}
                      <div className="w-28 truncate flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        {getResourceTypeIcon(group.resource.type)}
                        <span className="truncate">{group.resource.code}</span>
                      </div>

                      {/* Resource Name */}
                      <div className="flex-1 px-2 truncate font-sans text-xs flex items-center gap-1.5">
                        <span className="truncate">{group.resource.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({group.assignments.length})
                        </span>
                      </div>

                      {/* Total Budgeted Units */}
                      <div className="w-20 text-right tabular-nums text-slate-900 dark:text-slate-100 text-[11px] font-bold">
                        {group.totalBudgetedUnits.toLocaleString()}
                      </div>

                      {/* Total Actual Units */}
                      <div className="w-18 text-right tabular-nums text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                        {group.totalActualUnits.toLocaleString()}
                      </div>

                      {/* Total Remaining Units */}
                      <div className="w-18 text-right tabular-nums text-slate-600 dark:text-slate-400 text-[11px]">
                        {group.totalRemainingUnits.toLocaleString()}
                      </div>
                    </div>

                    {/* Child Assigned Activities (when expanded) */}
                    {isExpanded &&
                      group.assignments.map(({ assignment, activity }) => {
                        const isSelected = activity.id === selectedActivityId;
                        const rowKey = `${group.resource.id}_${activity.id}`;
                        const remainUnits = Math.max(0, (assignment.targetUnits || 0) - (assignment.actUnits || 0));

                        return (
                          <div
                            key={rowKey}
                            style={{ height: `${rowHeight}px` }}
                            onClick={() => onSelectActivity(activity)}
                            onMouseEnter={() => setHoveredRowId(rowKey)}
                            onMouseLeave={() => setHoveredRowId(null)}
                            className={`flex items-center px-3 pl-8 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'
                                : hoveredRowId === rowKey
                                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                            }`}
                          >
                            <div className="w-6" />

                            {/* Activity Code */}
                            <div className="w-28 truncate font-medium text-slate-600 dark:text-slate-400 text-[11px]">
                              {activity.code}
                            </div>

                            {/* Activity Name */}
                            <div className="flex-1 px-2 truncate font-sans text-xs text-slate-800 dark:text-slate-200">
                              {activity.name}
                            </div>

                            {/* Assignment Target Qty */}
                            <div className="w-20 text-right tabular-nums text-slate-700 dark:text-slate-300 text-[11px]">
                              {assignment.targetUnits ? assignment.targetUnits.toLocaleString() : '—'}
                            </div>

                            {/* Assignment Actual Qty */}
                            <div className="w-18 text-right tabular-nums text-emerald-700 dark:text-emerald-400 text-[11px]">
                              {assignment.actUnits ? assignment.actUnits.toLocaleString() : '0'}
                            </div>

                            {/* Assignment Remaining Qty */}
                            <div className="w-18 text-right tabular-nums text-slate-500 dark:text-slate-400 text-[11px]">
                              {remainUnits.toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>

        {/* Right Scrollable Gantt Timeline Canvas */}
        <div
          ref={timelineRef}
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

            {/* Vertical Grid Lines */}
            <div className="absolute inset-x-0 pointer-events-none top-12 bottom-0">
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

            {/* Timeline Assignment Bars */}
            <div className="relative top-12">
              {filteredGroups.map((group) => {
                const isExpanded = expandedResourceIds.has(group.resource.id);

                // Resource rollup span (min start to max finish across assignments)
                let groupMinStart: string | undefined;
                let groupMaxFinish: string | undefined;
                for (const asgn of group.assignments) {
                  if (asgn.activity.startDate && (!groupMinStart || asgn.activity.startDate < groupMinStart)) {
                    groupMinStart = asgn.activity.startDate;
                  }
                  if (asgn.activity.finishDate && (!groupMaxFinish || asgn.activity.finishDate > groupMaxFinish)) {
                    groupMaxFinish = asgn.activity.finishDate;
                  }
                }

                const resStartX = groupMinStart ? getXCoordinate(groupMinStart) : 0;
                const resFinishX = groupMaxFinish ? getXCoordinate(groupMaxFinish) : 0;
                const resWidth = Math.max(10, resFinishX - resStartX);

                return (
                  <React.Fragment key={group.resource.id}>
                    {/* Parent Resource Rollup Bar */}
                    <div
                      style={{ height: `${rowHeight}px` }}
                      className="relative flex items-center border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40"
                    >
                      {groupMinStart && groupMaxFinish && (
                        <div
                          style={{
                            left: `${resStartX}px`,
                            width: `${resWidth}px`,
                          }}
                          className="absolute h-3 rounded bg-amber-500/30 dark:bg-amber-400/25 border border-amber-500/60"
                        >
                          <span className="absolute -top-3.5 left-0 text-[10px] font-mono text-amber-800 dark:text-amber-300 font-semibold whitespace-nowrap">
                            {group.resource.code} [{group.totalBudgetedUnits.toLocaleString()} units]
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Child Activity Assignment Bars */}
                    {isExpanded &&
                      group.assignments.map(({ assignment, activity }) => {
                        const startX = getXCoordinate(activity.startDate);
                        const finishX = getXCoordinate(activity.finishDate);
                        const width = Math.max(12, finishX - startX);
                        const isSelected = activity.id === selectedActivityId;
                        const rowKey = `${group.resource.id}_${activity.id}`;

                        return (
                          <div
                            key={rowKey}
                            style={{ height: `${rowHeight}px` }}
                            onClick={() => onSelectActivity(activity)}
                            className={`relative flex items-center border-b border-slate-100 dark:border-slate-800/30 transition-colors ${
                              isSelected ? 'bg-amber-500/10' : ''
                            }`}
                          >
                            {/* Gantt Bar for Assignment */}
                            <div
                              style={{
                                left: `${startX}px`,
                                width: `${width}px`,
                              }}
                              className={`absolute h-5 rounded cursor-pointer z-10 overflow-hidden flex items-center transition-all ${
                                group.resource.type === 'RT_Labor'
                                  ? 'bg-blue-600/90 border border-blue-500 shadow-xs'
                                  : group.resource.type === 'RT_Nonlabor'
                                  ? 'bg-amber-600/90 border border-amber-500 shadow-xs'
                                  : 'bg-emerald-600/90 border border-emerald-500 shadow-xs'
                              } ${isSelected ? 'ring-2 ring-amber-400' : ''}`}
                            >
                              {/* Progress bar inside */}
                              {activity.physCompletePct > 0 && (
                                <div
                                  style={{ width: `${Math.min(100, activity.physCompletePct)}%` }}
                                  className="h-full bg-emerald-400/80"
                                />
                              )}

                              {width > 50 && (
                                <span className="absolute left-1.5 text-[10px] font-sans font-medium text-white truncate max-w-[calc(100%-8px)] drop-shadow">
                                  {activity.name}
                                </span>
                              )}
                            </div>

                            {/* Assignment units text label */}
                            <div
                              style={{ left: `${Math.max(finishX + 8, startX + width + 8)}px` }}
                              className="absolute text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap pointer-events-none flex items-center gap-1.5"
                            >
                              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                {activity.code}
                              </span>
                              <span className="text-[10px] text-slate-500 font-sans">
                                ({assignment.targetUnits || 0} {group.resource.unit || 'units'})
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
