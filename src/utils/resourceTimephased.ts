import { Activity, Calendar, ParsedProject, ResourceAssignment, ResourceCurve } from '../types/xer';

export type TimeBucketGranularity = 'week' | 'month' | 'quarter' | 'year';
export type TimephasedMetric = 'cost' | 'units' | 'manpower';

export interface TimephasedBucket {
  key: string;
  label: string;
  shortLabel: string;
  startIso: string;
  endIso: string;
  startDay: number;
  endDay: number;
  workingDays: number;
  workingHours: number;

  // Period Histogram Values (Cost, Units, or Average Daily Headcount in Manpower mode)
  planned: number;
  actual: number;
  remaining: number;
  latePlanned: number;

  // Stacked breakdown of Planned / Forecast by resource type
  labor: number;
  nonLabor: number;
  material: number;

  // Raw Period Hours/Units (useful for Manpower tooltip & cumulative Man-Days)
  rawPlannedHours: number;
  rawActualHours: number;
  rawRemainingHours: number;

  // Cumulative S-Curve Values
  cumPlanned: number;
  cumActual: number;
  cumForecast: number; // Actual to Data Date + Remaining thereafter
  cumLatePlanned: number;

  // Cumulative % of Total Planned (0..100+)
  cumPlannedPct: number;
  cumActualPct: number;
  cumForecastPct: number;
  cumLatePlannedPct: number;

  // Resource Capacity / Over-allocation (only populated when single resource or limit applies)
  maxLimit?: number;
  isOverallocated: boolean;
  isBeforeOrAtDataDate: boolean;
}

export interface TimephasedResult {
  buckets: TimephasedBucket[];
  dataDateIso?: string;
  dataDateBucketFraction?: number; // 0..buckets.length continuous index for vertical DD line
  metric: TimephasedMetric;
  unitLabel: string;
  cumUnitLabel: string;
  totalPlanned: number;
  totalActual: number;
  totalRemaining: number;
  totalEac: number; // Actual + Remaining
  varianceAtCompletion: number; // EAC - Planned
  peakPeriodValue: number;
  peakPeriodLabel: string;
  overallocatedBucketsCount: number;
  curvedAssignmentsCount: number;
  totalAssignmentsIncluded: number;
  hasActuals: boolean;
  hasLateDates: boolean;
  hasMaxLimit: boolean;
  mixedMaterialUnitsWarning: boolean;
  distinctUnits: string[];
  calendarNonWorkingDaysApplied: number;
}

const DAY_MS = 86_400_000;
const DAY_NAME_TO_UTC_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoToDayNum(iso?: string): number | null {
  if (!iso) return null;
  const ms = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / DAY_MS);
}

function dayNumToIso(dayNum: number): string {
  return new Date(dayNum * DAY_MS).toISOString().slice(0, 10);
}

interface CalendarLookup {
  workingDows: Set<number>;
  exceptionDays: Set<number>;
  extraWorkDays: Set<number>;
  hoursPerDay: number;
}

function buildCalendarLookup(cal?: Calendar): CalendarLookup {
  const workingDows = new Set<number>();
  if (cal && cal.workingWeekdays.length > 0) {
    for (const d of cal.workingWeekdays) {
      const dow = DAY_NAME_TO_UTC_DOW[d];
      if (dow !== undefined) workingDows.add(dow);
    }
  }
  if (workingDows.size === 0) {
    // Standard Mon-Fri
    workingDows.add(1);
    workingDows.add(2);
    workingDows.add(3);
    workingDows.add(4);
    workingDows.add(5);
  }

  const exceptionDays = new Set<number>();
  if (cal?.exceptionDates) {
    for (const iso of cal.exceptionDates) {
      const dn = isoToDayNum(iso);
      if (dn !== null) exceptionDays.add(dn);
    }
  }

  const extraWorkDays = new Set<number>();
  if (cal?.extraWorkingDates) {
    for (const iso of cal.extraWorkingDates) {
      const dn = isoToDayNum(iso);
      if (dn !== null) extraWorkDays.add(dn);
    }
  }

  return {
    workingDows,
    exceptionDays,
    extraWorkDays,
    hoursPerDay: cal?.hoursPerDay && cal.hoursPerDay > 0 ? cal.hoursPerDay : 8,
  };
}

function isWorkingDay(dayNum: number, cal: CalendarLookup): boolean {
  if (cal.extraWorkDays.has(dayNum)) return true;
  if (cal.exceptionDays.has(dayNum)) return false;
  // Unix epoch 1970-01-01 (day 0) was Thursday (dow = 4)
  const dow = (((dayNum + 4) % 7) + 7) % 7;
  return cal.workingDows.has(dow);
}

/**
 * Generates contiguous time buckets covering [minDay, maxDay]
 */
function buildTimeBuckets(
  minDay: number,
  maxDay: number,
  granularity: TimeBucketGranularity,
  defaultCal: CalendarLookup
): {
  buckets: TimephasedBucket[];
  dayToBucketIdx: (dayNum: number) => number;
} {
  const buckets: TimephasedBucket[] = [];
  const startDate = new Date(minDay * DAY_MS);
  const endDate = new Date(maxDay * DAY_MS);

  if (granularity === 'week') {
    // Align to Monday of minDay's week
    const startDow = startDate.getUTCDay(); // 0=Sun..6=Sat
    const offsetToMon = startDow === 0 ? -6 : 1 - startDow;
    let cur = minDay + offsetToMon;
    let guard = 0;
    while (cur <= maxDay && guard < 1000) {
      guard++;
      const bStart = cur;
      const bEnd = cur + 6;
      const d = new Date(bStart * DAY_MS);
      const yr = d.getUTCFullYear();
      const mon = MONTH_NAMES[d.getUTCMonth()];
      const day = String(d.getUTCDate()).padStart(2, '0');
      const startIso = dayNumToIso(bStart);
      const endIso = dayNumToIso(bEnd);

      buckets.push(createEmptyBucket(`W_${startIso}`, `${day} ${mon} ${yr}`, `${day} ${mon}`, startIso, endIso, bStart, bEnd, defaultCal));
      cur += 7;
    }
  } else if (granularity === 'month') {
    let year = startDate.getUTCFullYear();
    let month = startDate.getUTCMonth();
    const endYear = endDate.getUTCFullYear();
    const endMonth = endDate.getUTCMonth();
    let guard = 0;
    while ((year < endYear || (year === endYear && month <= endMonth)) && guard < 400) {
      guard++;
      const bStart = Math.floor(Date.UTC(year, month, 1) / DAY_MS);
      const bEnd = Math.floor(Date.UTC(year, month + 1, 0) / DAY_MS);
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[month]} ${year}`;
      const shortLabel = `${MONTH_NAMES[month]} '${String(year).slice(-2)}`;
      buckets.push(createEmptyBucket(key, label, shortLabel, dayNumToIso(bStart), dayNumToIso(bEnd), bStart, bEnd, defaultCal));
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
  } else if (granularity === 'quarter') {
    let year = startDate.getUTCFullYear();
    let q = Math.floor(startDate.getUTCMonth() / 3);
    const endYear = endDate.getUTCFullYear();
    const endQ = Math.floor(endDate.getUTCMonth() / 3);
    let guard = 0;
    while ((year < endYear || (year === endYear && q <= endQ)) && guard < 200) {
      guard++;
      const bStart = Math.floor(Date.UTC(year, q * 3, 1) / DAY_MS);
      const bEnd = Math.floor(Date.UTC(year, q * 3 + 3, 0) / DAY_MS);
      const key = `${year}-Q${q + 1}`;
      const label = `Q${q + 1} ${year}`;
      const shortLabel = `Q${q + 1} '${String(year).slice(-2)}`;
      buckets.push(createEmptyBucket(key, label, shortLabel, dayNumToIso(bStart), dayNumToIso(bEnd), bStart, bEnd, defaultCal));
      q++;
      if (q > 3) {
        q = 0;
        year++;
      }
    }
  } else {
    // year
    let year = startDate.getUTCFullYear();
    const endYear = endDate.getUTCFullYear();
    let guard = 0;
    while (year <= endYear && guard < 100) {
      guard++;
      const bStart = Math.floor(Date.UTC(year, 0, 1) / DAY_MS);
      const bEnd = Math.floor(Date.UTC(year, 11, 31) / DAY_MS);
      const key = String(year);
      buckets.push(createEmptyBucket(key, key, key, dayNumToIso(bStart), dayNumToIso(bEnd), bStart, bEnd, defaultCal));
      year++;
    }
  }

  // Binary search day -> bucket index
  const dayToBucketIdx = (dayNum: number): number => {
    if (buckets.length === 0) return -1;
    if (dayNum < buckets[0].startDay) return 0;
    if (dayNum > buckets[buckets.length - 1].endDay) return buckets.length - 1;
    let lo = 0;
    let hi = buckets.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const b = buckets[mid];
      if (dayNum < b.startDay) hi = mid - 1;
      else if (dayNum > b.endDay) lo = mid + 1;
      else return mid;
    }
    return Math.max(0, Math.min(buckets.length - 1, lo));
  };

  return { buckets, dayToBucketIdx };
}

function createEmptyBucket(
  key: string,
  label: string,
  shortLabel: string,
  startIso: string,
  endIso: string,
  startDay: number,
  endDay: number,
  cal: CalendarLookup
): TimephasedBucket {
  let workingDays = 0;
  for (let d = startDay; d <= endDay; d++) {
    if (isWorkingDay(d, cal)) workingDays++;
  }
  const safeWorkingDays = Math.max(1, workingDays);
  return {
    key,
    label,
    shortLabel,
    startIso,
    endIso,
    startDay,
    endDay,
    workingDays: safeWorkingDays,
    workingHours: safeWorkingDays * cal.hoursPerDay,
    planned: 0,
    actual: 0,
    remaining: 0,
    latePlanned: 0,
    labor: 0,
    nonLabor: 0,
    material: 0,
    rawPlannedHours: 0,
    rawActualHours: 0,
    rawRemainingHours: 0,
    cumPlanned: 0,
    cumActual: 0,
    cumForecast: 0,
    cumLatePlanned: 0,
    cumPlannedPct: 0,
    cumActualPct: 0,
    cumForecastPct: 0,
    cumLatePlannedPct: 0,
    isOverallocated: false,
    isBeforeOrAtDataDate: false,
  };
}

/**
 * Evaluates a P6 21-point resource curve weight at normalized progress fraction u in [0, 1].
 */
function sampleCurveWeight(curve: ResourceCurve, u: number): number {
  const clamped = Math.max(0, Math.min(1, u));
  const scaled = clamped * 20; // 0..20
  const idx = Math.floor(scaled);
  if (idx >= 20) return curve.pctValues[20] ?? 0;
  const frac = scaled - idx;
  const v0 = curve.pctValues[idx] ?? 0;
  const v1 = curve.pctValues[idx + 1] ?? v0;
  return v0 + (v1 - v0) * frac;
}

/**
 * Spreads a numeric value across [startDay..endDay] into buckets using calendar working days
 * and optional Primavera P6 21-point resource curve.
 */
function spreadValueIntoBuckets(
  value: number,
  startDay: number,
  endDay: number,
  buckets: TimephasedBucket[],
  dayToBucketIdx: (d: number) => number,
  cal: CalendarLookup,
  useCalendarAware: boolean,
  curve: ResourceCurve | undefined,
  onAdd: (bucket: TimephasedBucket, amount: number) => void
) {
  if (!Number.isFinite(value) || value === 0 || buckets.length === 0) return;

  const s = Math.min(startDay, endDay);
  const e = Math.max(startDay, endDay);
  const spanDays = e - s + 1;

  // Fast path: single day or milestone
  if (spanDays <= 1) {
    const idx = dayToBucketIdx(s);
    if (idx >= 0) onAdd(buckets[idx], value);
    return;
  }

  // Fast path: uniform linear calendar-day spread without curves (O(buckets overlapped))
  if (!useCalendarAware && !curve) {
    const startIdx = dayToBucketIdx(s);
    const endIdx = dayToBucketIdx(e);
    for (let bi = startIdx; bi <= endIdx; bi++) {
      const b = buckets[bi];
      const ovStart = Math.max(s, b.startDay);
      const ovEnd = Math.min(e, b.endDay);
      if (ovEnd >= ovStart) {
        const share = (ovEnd - ovStart + 1) / spanDays;
        onAdd(b, value * share);
      }
    }
    return;
  }

  // Calendar-aware and/or P6 curve-weighted spread
  // For very long spans (>1500 days, e.g. multi-year LOE), sample every stepDays to keep sub-15ms speed
  const step = spanDays > 1500 ? Math.ceil(spanDays / 1000) : 1;

  const activeDays: number[] = [];
  for (let d = s; d <= e; d += step) {
    if (!useCalendarAware || isWorkingDay(d, cal)) {
      activeDays.push(d);
    }
  }

  // Fallback if span falls entirely inside non-working days (e.g., holiday override)
  if (activeDays.length === 0) {
    for (let d = s; d <= e; d += step) {
      activeDays.push(d);
    }
  }

  const count = activeDays.length;
  if (count === 0) return;

  if (!curve) {
    // Equal weight per working day, accumulate per bucket
    const perDay = value / count;
    let currentBucketIdx = -1;
    let bucketSum = 0;
    for (let i = 0; i < count; i++) {
      const bi = dayToBucketIdx(activeDays[i]);
      if (bi === currentBucketIdx) {
        bucketSum += perDay;
      } else {
        if (currentBucketIdx >= 0 && bucketSum !== 0) {
          onAdd(buckets[currentBucketIdx], bucketSum);
        }
        currentBucketIdx = bi;
        bucketSum = perDay;
      }
    }
    if (currentBucketIdx >= 0 && bucketSum !== 0) {
      onAdd(buckets[currentBucketIdx], bucketSum);
    }
    return;
  }

  // Curve-weighted distribution across active working days
  const weights = new Float64Array(count);
  let totalWeight = 0;
  for (let i = 0; i < count; i++) {
    const u = count === 1 ? 0.5 : (i + 0.5) / count;
    const w = sampleCurveWeight(curve, u);
    weights[i] = w;
    totalWeight += w;
  }

  if (totalWeight <= 0) {
    const perDay = value / count;
    for (let i = 0; i < count; i++) {
      const bi = dayToBucketIdx(activeDays[i]);
      if (bi >= 0) onAdd(buckets[bi], perDay);
    }
    return;
  }

  let currentBucketIdx = -1;
  let bucketSum = 0;
  for (let i = 0; i < count; i++) {
    const bi = dayToBucketIdx(activeDays[i]);
    const amt = (value * weights[i]) / totalWeight;
    if (bi === currentBucketIdx) {
      bucketSum += amt;
    } else {
      if (currentBucketIdx >= 0 && bucketSum !== 0) {
        onAdd(buckets[currentBucketIdx], bucketSum);
      }
      currentBucketIdx = bi;
      bucketSum = amt;
    }
  }
  if (currentBucketIdx >= 0 && bucketSum !== 0) {
    onAdd(buckets[currentBucketIdx], bucketSum);
  }
}

export interface TimephasedOptions {
  selectedResourceIds: Set<string> | null; // null => Whole Project
  singleLeafResourceId?: string | null;
  wbsSubtreeIds?: Set<string> | null; // null => All WBS
  granularity: TimeBucketGranularity;
  metric: TimephasedMetric;
  useCalendarAware: boolean;
  useP6Curves: boolean;
}

/**
 * Computes complete time-phased Histogram & S-Curve dataset from ParsedProject
 */
export function computeResourceTimephased(
  project: ParsedProject,
  options: TimephasedOptions
): TimephasedResult {
  const {
    selectedResourceIds,
    singleLeafResourceId,
    wbsSubtreeIds,
    granularity,
    metric,
    useCalendarAware,
    useP6Curves,
  } = options;

  // Build calendar lookup map
  const calLookupMap = new Map<string, CalendarLookup>();
  let defaultCalLookup: CalendarLookup | null = null;
  let calendarNonWorkingDaysApplied = 0;

  for (const cal of project.calendars) {
    const lookup = buildCalendarLookup(cal);
    calLookupMap.set(cal.id, lookup);
    if (cal.isDefault || cal.id === project.metadata.defaultCalendarId) {
      defaultCalLookup = lookup;
    }
    calendarNonWorkingDaysApplied += cal.exceptionDates.length;
  }
  if (!defaultCalLookup) {
    defaultCalLookup =
      project.calendars.length > 0
        ? calLookupMap.get(project.calendars[0].id)!
        : buildCalendarLookup(undefined);
  }

  const rsrcById = new Map(project.resources.map((r) => [r.id, r]));

  // Gather filtered (activity, assignment) pairs
  const pairs: { activity: Activity; assignment: ResourceAssignment }[] = [];
  const distinctUnitsSet = new Set<string>();
  let curvedAssignmentsCount = 0;

  for (const act of project.activities) {
    if (wbsSubtreeIds && !wbsSubtreeIds.has(act.wbsId)) continue;
    for (const asgn of act.assignments) {
      if (selectedResourceIds && !selectedResourceIds.has(asgn.resourceId)) continue;
      if (metric === 'manpower' && asgn.resourceType !== 'RT_Labor') continue;
      pairs.push({ activity: act, assignment: asgn });
      const rObj = rsrcById.get(asgn.resourceId);
      if (rObj?.unit) distinctUnitsSet.add(rObj.unit);
      if (asgn.curveId && project.resourceCurves?.has(asgn.curveId)) {
        curvedAssignmentsCount++;
      }
    }
  }

  const dataDateIso = project.metadata.dataDate;
  const dataDateDay = isoToDayNum(dataDateIso);

  const distinctUnits = Array.from(distinctUnitsSet);
  const mixedMaterialUnitsWarning = metric === 'units' && distinctUnits.length > 1;
  const currencyLabel = project.metadata.currencyCode || project.metadata.currencySymbol || 'USD';
  const unitLabel =
    metric === 'cost'
      ? currencyLabel
      : metric === 'manpower'
      ? 'Heads / Day'
      : distinctUnits.length === 1
      ? distinctUnits[0]
      : 'Units';
  const cumUnitLabel =
    metric === 'cost'
      ? currencyLabel
      : metric === 'manpower'
      ? 'Man-Days'
      : distinctUnits.length === 1
      ? distinctUnits[0]
      : 'Units';

  // Find timeline bounds across all matching assignments
  let minDay = Infinity;
  let maxDay = -Infinity;
  let hasActuals = false;
  let hasLateDates = false;

  for (const { activity: act, assignment: asgn } of pairs) {
    const pStart = isoToDayNum(asgn.targetStartDate || act.targetStartDate || act.earlyStartDate || act.startDate);
    const pEnd = isoToDayNum(asgn.targetEndDate || act.targetFinishDate || act.earlyFinishDate || act.finishDate);
    const aStart = isoToDayNum(asgn.actualStartDate || act.actualStartDate);
    const aEnd = isoToDayNum(asgn.actualEndDate || act.actualFinishDate || (aStart !== null ? dataDateIso : undefined));
    const rStart = isoToDayNum(asgn.remainStartDate || (act.status === 'TK_Active' ? dataDateIso : undefined) || act.earlyStartDate || act.startDate);
    const rEnd = isoToDayNum(asgn.remainEndDate || act.earlyFinishDate || act.finishDate);
    const lStart = isoToDayNum(act.lateStartDate);
    const lEnd = isoToDayNum(act.lateFinishDate);

    if (lStart !== null && lEnd !== null) hasLateDates = true;
    const actVal = metric === 'cost' ? asgn.actCost : asgn.actUnits;
    if (actVal > 0) hasActuals = true;

    for (const d of [pStart, pEnd, aStart, aEnd, rStart, rEnd, lStart, lEnd]) {
      if (d !== null) {
        if (d < minDay) minDay = d;
        if (d > maxDay) maxDay = d;
      }
    }
  }

  if (!Number.isFinite(minDay) || !Number.isFinite(maxDay) || pairs.length === 0) {
    return {
      buckets: [],
      dataDateIso,
      metric,
      unitLabel,
      cumUnitLabel,
      totalPlanned: 0,
      totalActual: 0,
      totalRemaining: 0,
      totalEac: 0,
      varianceAtCompletion: 0,
      peakPeriodValue: 0,
      peakPeriodLabel: '—',
      overallocatedBucketsCount: 0,
      curvedAssignmentsCount,
      totalAssignmentsIncluded: pairs.length,
      hasActuals: false,
      hasLateDates: false,
      hasMaxLimit: false,
      mixedMaterialUnitsWarning,
      distinctUnits,
      calendarNonWorkingDaysApplied,
    };
  }

  const { buckets, dayToBucketIdx } = buildTimeBuckets(minDay, maxDay, granularity, defaultCalLookup);

  // Spread every matching assignment into buckets
  for (const { activity: act, assignment: asgn } of pairs) {
    const cal = (act.calendarId && calLookupMap.get(act.calendarId)) || defaultCalLookup;
    const curve =
      useP6Curves && asgn.curveId ? project.resourceCurves?.get(asgn.curveId) : undefined;

    const plannedVal = metric === 'cost' ? asgn.targetCost : asgn.targetUnits;
    const actualVal = metric === 'cost' ? asgn.actCost : asgn.actUnits;
    const remainVal = metric === 'cost' ? asgn.remainCost : asgn.remainUnits;

    // 1. Early / Planned spread
    const pStart = isoToDayNum(asgn.targetStartDate || act.targetStartDate || act.earlyStartDate || act.startDate);
    const pEnd = isoToDayNum(asgn.targetEndDate || act.targetFinishDate || act.earlyFinishDate || act.finishDate) ?? pStart;
    if (pStart !== null && pEnd !== null && plannedVal > 0) {
      spreadValueIntoBuckets(plannedVal, pStart, pEnd, buckets, dayToBucketIdx, cal, useCalendarAware, curve, (b, amt) => {
        b.planned += amt;
        if (metric === 'manpower') b.rawPlannedHours += amt;
        if (asgn.resourceType === 'RT_Labor') b.labor += amt;
        else if (asgn.resourceType === 'RT_Nonlabor') b.nonLabor += amt;
        else b.material += amt;
      });
    }

    // 2. Late Planned spread (for Banana Curve envelope)
    const lStart = isoToDayNum(act.lateStartDate) ?? pStart;
    const lEnd = isoToDayNum(act.lateFinishDate) ?? pEnd;
    if (lStart !== null && lEnd !== null && plannedVal > 0) {
      spreadValueIntoBuckets(plannedVal, lStart, lEnd, buckets, dayToBucketIdx, cal, useCalendarAware, curve, (b, amt) => {
        b.latePlanned += amt;
      });
    }

    // 3. Actual spread (for Update schedules)
    if (actualVal > 0) {
      const aStart = isoToDayNum(asgn.actualStartDate || act.actualStartDate || act.startDate) ?? pStart;
      const aEnd =
        isoToDayNum(asgn.actualEndDate || act.actualFinishDate) ??
        (dataDateDay !== null && aStart !== null ? Math.max(aStart, dataDateDay) : pEnd);
      if (aStart !== null && aEnd !== null) {
        spreadValueIntoBuckets(actualVal, aStart, aEnd, buckets, dayToBucketIdx, cal, useCalendarAware, undefined, (b, amt) => {
          b.actual += amt;
          if (metric === 'manpower') b.rawActualHours += amt;
        });
      }
    }

    // 4. Remaining / Forecast spread
    if (remainVal > 0 && act.status !== 'TK_Complete') {
      let rStart = isoToDayNum(asgn.remainStartDate || (act.status === 'TK_Active' ? dataDateIso : undefined) || act.earlyStartDate || act.startDate);
      if (rStart !== null && dataDateDay !== null && act.status === 'TK_Active' && rStart < dataDateDay) {
        rStart = dataDateDay;
      }
      const rEnd = isoToDayNum(asgn.remainEndDate || act.earlyFinishDate || act.finishDate) ?? rStart;
      if (rStart !== null && rEnd !== null) {
        spreadValueIntoBuckets(remainVal, rStart, Math.max(rStart, rEnd), buckets, dayToBucketIdx, cal, useCalendarAware, curve, (b, amt) => {
          b.remaining += amt;
          if (metric === 'manpower') b.rawRemainingHours += amt;
        });
      }
    }
  }

  // Single resource capacity max limit (from %T RSRCRATE max_qty_per_hr)
  const singleResource = singleLeafResourceId ? rsrcById.get(singleLeafResourceId) : undefined;
  const maxPerHr =
    singleResource && singleResource.maxUnitsPerHour && singleResource.maxUnitsPerHour > 0
      ? singleResource.maxUnitsPerHour
      : undefined;
  const hasMaxLimit = Boolean(maxPerHr && (metric === 'units' || metric === 'manpower'));

  // Post-process Manpower headcount conversion + Cumulative S-Curves + Over-allocation check
  let cumPlanned = 0;
  let cumActual = 0;
  let cumForecast = 0;
  let cumLate = 0;
  let totalPlanned = 0;
  let totalActual = 0;
  let totalRemaining = 0;
  let peakPeriodValue = 0;
  let peakPeriodLabel = '—';
  let overallocatedBucketsCount = 0;

  const avgHoursPerDay = defaultCalLookup.hoursPerDay || 8;

  for (const b of buckets) {
    b.isBeforeOrAtDataDate = dataDateDay !== null ? b.startDay <= dataDateDay : false;

    if (metric === 'manpower') {
      // Histogram bars = Average Daily Headcount (period labor hours / bucket working hours)
      const hrsInBucket = Math.max(avgHoursPerDay, b.workingHours);
      const plannedHeads = b.rawPlannedHours / hrsInBucket;
      const actualHeads = b.rawActualHours / hrsInBucket;
      const remainHeads = b.rawRemainingHours / hrsInBucket;
      const lateHeads = b.latePlanned / hrsInBucket;

      // Cumulative S-Curve = Cumulative Man-Days (total hours / hoursPerDay)
      const plannedManDays = b.rawPlannedHours / avgHoursPerDay;
      const actualManDays = b.rawActualHours / avgHoursPerDay;
      const remainManDays = b.rawRemainingHours / avgHoursPerDay;
      const lateManDays = b.latePlanned / avgHoursPerDay;

      b.planned = Math.round(plannedHeads * 100) / 100;
      b.actual = Math.round(actualHeads * 100) / 100;
      b.remaining = Math.round(remainHeads * 100) / 100;
      b.latePlanned = Math.round(lateHeads * 100) / 100;
      b.labor = b.planned;
      b.nonLabor = 0;
      b.material = 0;

      totalPlanned += plannedManDays;
      totalActual += actualManDays;
      totalRemaining += remainManDays;

      cumPlanned += plannedManDays;
      cumActual += actualManDays;
      cumForecast += actualManDays + remainManDays;
      cumLate += lateManDays;
    } else {
      totalPlanned += b.planned;
      totalActual += b.actual;
      totalRemaining += b.remaining;

      cumPlanned += b.planned;
      cumActual += b.actual;
      cumForecast += b.actual + b.remaining;
      cumLate += b.latePlanned;
    }

    b.cumPlanned = cumPlanned;
    b.cumActual = cumActual;
    b.cumForecast = cumForecast;
    b.cumLatePlanned = cumLate;

    const periodDemand = Math.max(b.planned, b.actual + b.remaining);
    if (periodDemand > peakPeriodValue) {
      peakPeriodValue = periodDemand;
      peakPeriodLabel = b.label;
    }

    if (hasMaxLimit && maxPerHr !== undefined) {
      b.maxLimit = metric === 'manpower' ? maxPerHr : maxPerHr * b.workingHours;
      if (periodDemand > b.maxLimit * 1.001) {
        b.isOverallocated = true;
        overallocatedBucketsCount++;
      }
    }
  }

  // Compute cumulative % normalized against totalPlanned (or totalEac fallback)
  const pctDenominator = totalPlanned > 0 ? totalPlanned : totalActual + totalRemaining || 1;
  for (const b of buckets) {
    b.cumPlannedPct = Math.round((b.cumPlanned / pctDenominator) * 1000) / 10;
    b.cumActualPct = Math.round((b.cumActual / pctDenominator) * 1000) / 10;
    b.cumForecastPct = Math.round((b.cumForecast / pctDenominator) * 1000) / 10;
    b.cumLatePlannedPct = Math.round((b.cumLatePlanned / pctDenominator) * 1000) / 10;
  }

  // Compute continuous Data Date bucket position (0..buckets.length) for vertical marker
  let dataDateBucketFraction: number | undefined;
  if (dataDateDay !== null && buckets.length > 0) {
    if (dataDateDay >= buckets[0].startDay && dataDateDay <= buckets[buckets.length - 1].endDay) {
      const idx = dayToBucketIdx(dataDateDay);
      const b = buckets[idx];
      const bSpan = Math.max(1, b.endDay - b.startDay + 1);
      const fracWithin = Math.max(0, Math.min(1, (dataDateDay - b.startDay) / bSpan));
      dataDateBucketFraction = idx + fracWithin;
    }
  }

  const totalEac = totalActual + totalRemaining;

  return {
    buckets,
    dataDateIso,
    dataDateBucketFraction,
    metric,
    unitLabel,
    cumUnitLabel,
    totalPlanned,
    totalActual,
    totalRemaining,
    totalEac,
    varianceAtCompletion: totalEac - totalPlanned,
    peakPeriodValue,
    peakPeriodLabel,
    overallocatedBucketsCount,
    curvedAssignmentsCount,
    totalAssignmentsIncluded: pairs.length,
    hasActuals,
    hasLateDates,
    hasMaxLimit,
    mixedMaterialUnitsWarning,
    distinctUnits,
    calendarNonWorkingDaysApplied,
  };
}
