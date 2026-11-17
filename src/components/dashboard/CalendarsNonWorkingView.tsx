import React, { useMemo, useState } from 'react';
import { Calendar, ParsedProject } from '../../types/xer';
import { CalendarSummaryItem } from '../../types/healthCheck';
import { downloadCsvFile } from '../../utils/scheduleAnalysis';
import {
  Calendar as CalendarIcon,
  CloudRain,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CalendarsNonWorkingViewProps {
  project: ParsedProject;
  calendarAssignmentBreakdown: CalendarSummaryItem[];
}

const ALL_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarsNonWorkingView: React.FC<CalendarsNonWorkingViewProps> = ({
  project,
  calendarAssignmentBreakdown,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'inUse' | 'CA_Project' | 'CA_Base' | 'CA_Rsrc'>('all');
  const [expandedCalendarId, setExpandedCalendarId] = useState<string | null>(
    project.calendars.find((c) => (c.assignedActivitiesCount || 0) > 0)?.id || project.calendars[0]?.id || null
  );

  const filteredCalendars = useMemo(() => {
    return project.calendars
      .filter((c) => {
        if (filterType === 'inUse') return (c.assignedActivitiesCount || 0) > 0;
        if (filterType === 'CA_Project') return c.type === 'CA_Project';
        if (filterType === 'CA_Base') return c.type === 'CA_Base';
        if (filterType === 'CA_Rsrc') return c.type === 'CA_Rsrc';
        return true;
      })
      .sort((a, b) => (b.assignedActivitiesCount || 0) - (a.assignedActivitiesCount || 0));
  }, [project.calendars, filterType]);

  const totalMonsoonOrExtended = useMemo(
    () =>
      project.calendars.reduce(
        (acc, c) => acc + c.nonWorkingPeriods.filter((p) => p.category === 'Monsoon / Extended Closure').length,
        0
      ),
    [project.calendars]
  );

  const totalExceptions = useMemo(
    () => project.calendars.reduce((acc, c) => acc + c.exceptionDates.length, 0),
    [project.calendars]
  );

  const handleExportCsv = () => {
    const headers = [
      'Calendar ID',
      'Calendar Name',
      'Calendar Type',
      'Default',
      'Hours / Day',
      'Assigned Activities',
      'Working Weekdays',
      'Non-Working Weekdays',
      'Monsoon / Extended Closures',
      'Total Holiday/Exception Days',
      'Exception Dates (Holidays & Monsoon Days)',
      'Extra Working Override Dates',
    ];

    const rows = filteredCalendars.map((c) => [
      c.id,
      c.name,
      c.typeLabel,
      c.isDefault ? 'Yes' : 'No',
      c.hoursPerDay,
      c.assignedActivitiesCount || 0,
      c.workingWeekdays.join(', '),
      c.nonWorkingWeekdays.join(', ') || 'None (7-day)',
      c.nonWorkingPeriods
        .filter((p) => p.category === 'Monsoon / Extended Closure')
        .map((p) => `${p.startDate} to ${p.endDate} (${p.calendarDays}d)`)
        .join('; ') || 'None',
      c.exceptionDates.length,
      c.exceptionDates.join(', ') || 'None',
      c.extraWorkingDates.join(', ') || 'None',
    ]);

    downloadCsvFile(
      `${project.metadata.code || 'project'}_Calendars_NonWorking_Periods.csv`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-500" />
            P6 Calendars, Activity Assignments &amp; Non-Working Periods (Monsoon / Holidays)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Direct extraction from Primavera P6 <span className="font-mono">%T CALENDAR clndr_data</span>: verifies Project vs Global vs Resource calendar assignments, weekly off-days, designated holidays, and monsoon/weather closures.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export Calendars &amp; Holidays CSV
        </button>
      </div>

      {/* Calendar Type Assignment Breakdown (Synchronized with Dashboard Counts) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {calendarAssignmentBreakdown.map((cal) => (
          <div
            key={cal.type}
            className="p-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {cal.type} Calendars
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  cal.type === 'Project'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : cal.type === 'Global'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                }`}
              >
                {cal.type}
              </span>
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                {cal.noOfCalendars}
              </span>
              <span className="text-xs text-slate-500">defined</span>
            </div>
            <span className="text-xs font-mono font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
              {cal.noOfAssignments.toLocaleString()} assigned activities
            </span>
          </div>
        ))}

        {/* Monsoon / Holiday KPI */}
        <div className="p-4 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
              Non-Working Exceptions
            </span>
            <CloudRain className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-extrabold text-sky-900 dark:text-sky-200 tabular-nums">
              {totalExceptions.toLocaleString()}
            </span>
            <span className="text-xs text-sky-700 dark:text-sky-400">exception dates</span>
          </div>
          <span className="text-xs font-mono font-semibold text-sky-700 dark:text-sky-300">
            {totalMonsoonOrExtended} monsoon / extended closure blocks
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: 'all', label: `All Calendars (${project.calendars.length})` },
            { key: 'inUse', label: `Assigned in Schedule (${project.calendars.filter((c) => (c.assignedActivitiesCount || 0) > 0).length})` },
            { key: 'CA_Project', label: `Project (${project.calendars.filter((c) => c.type === 'CA_Project').length})` },
            { key: 'CA_Base', label: `Global (${project.calendars.filter((c) => c.type === 'CA_Base').length})` },
            { key: 'CA_Rsrc', label: `Resource (${project.calendars.filter((c) => c.type === 'CA_Rsrc').length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filterType === tab.key
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Calendar Cards List */}
      <div className="space-y-3">
        {filteredCalendars.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500">
            No calendars matched the selected filter.
          </div>
        ) : (
          filteredCalendars.map((cal: Calendar) => {
            const isExpanded = expandedCalendarId === cal.id;
            const monsoonBlocks = cal.nonWorkingPeriods.filter((p) => p.category === 'Monsoon / Extended Closure');
            const multiDayBlocks = cal.nonWorkingPeriods.filter((p) => p.category === 'Multi-Day Holiday / Shutdown');
            const singleHolidays = cal.nonWorkingPeriods.filter((p) => p.category === 'Holiday');

            return (
              <div
                key={cal.id}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Accordion Header */}
                <button
                  onClick={() => setExpandedCalendarId(isExpanded ? null : cal.id)}
                  className="w-full px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        cal.type === 'CA_Project'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : cal.type === 'CA_Base'
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                      }`}
                    >
                      {cal.typeLabel}
                    </span>

                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {cal.name}
                    </span>

                    {cal.isDefault && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 text-[10px] font-semibold">
                        Project Default
                      </span>
                    )}

                    <span className="text-[11px] font-mono text-slate-500">
                      ID: {cal.id} · {cal.hoursPerDay}h/day
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {(cal.assignedActivitiesCount || 0).toLocaleString()} activities
                    </span>

                    {monsoonBlocks.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 font-semibold">
                        <CloudRain className="w-3.5 h-3.5" />
                        {monsoonBlocks.length} Monsoon / Closure Block(s)
                      </span>
                    )}

                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {cal.exceptionDates.length} holidays/exceptions
                    </span>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
                    {/* Workweek Grid */}
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-2">
                        Standard Workweek Configuration
                      </span>
                      <div className="grid grid-cols-7 gap-2">
                        {ALL_WEEKDAYS.map((day) => {
                          const isWorking = cal.workingWeekdays.includes(day);
                          return (
                            <div
                              key={day}
                              className={`p-2 rounded-lg border text-center ${
                                isWorking
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              <div className="font-bold text-xs">{day}</div>
                              <div className="mt-1 flex items-center justify-center gap-1 text-[10px]">
                                {isWorking ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" /> Work
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3" /> Off
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Monsoon / Extended Closures */}
                    {monsoonBlocks.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5 mb-2">
                          <CloudRain className="w-3.5 h-3.5" />
                          Monsoon &amp; Extended Non-Working Periods ({monsoonBlocks.length})
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {monsoonBlocks.map((p, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-xs"
                            >
                              <div className="font-bold text-sky-900 dark:text-sky-200">{p.label}</div>
                              <div className="font-mono text-sky-800 dark:text-sky-300 mt-1">
                                {p.startDate} &rarr; {p.endDate}
                              </div>
                              <div className="text-[11px] text-sky-700/80 dark:text-sky-400 mt-0.5">
                                {p.calendarDays} calendar days ({p.exceptionDatesCount} non-working exceptions)
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Multi-Day Closures */}
                    {multiDayBlocks.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-2">
                          Multi-Day Holidays / Shutdowns ({multiDayBlocks.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {multiDayBlocks.map((p, i) => (
                            <div
                              key={i}
                              className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-mono text-amber-900 dark:text-amber-200"
                            >
                              {p.startDate} &rarr; {p.endDate} ({p.calendarDays}d)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Designated Single Holidays */}
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-2">
                        Designated Holidays &amp; Exception Dates ({cal.exceptionDates.length} total days
                        {singleHolidays.length > 0 ? `, ${singleHolidays.length} standalone` : ''})
                      </span>
                      {cal.exceptionDates.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">
                          No holiday or non-working exception dates defined in this calendar's P6 <span className="font-mono">clndr_data</span>.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                          {cal.exceptionDates.map((d) => (
                            <span
                              key={d}
                              className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 font-mono text-[11px] text-rose-800 dark:text-rose-300"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Extra Working Override Dates */}
                    {cal.extraWorkingDates.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-2">
                          <Sparkles className="w-3.5 h-3.5" />
                          Extra Working-Day Overrides ({cal.extraWorkingDates.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {cal.extraWorkingDates.map((d) => (
                            <span
                              key={d}
                              className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 font-mono text-[11px] text-emerald-800 dark:text-emerald-300"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Working weekdays: <strong className="text-slate-700 dark:text-slate-300">{cal.workingWeekdays.join(', ')}</strong> · Non-working weekdays: <strong className="text-slate-700 dark:text-slate-300">{cal.nonWorkingWeekdays.join(', ') || 'None'}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
