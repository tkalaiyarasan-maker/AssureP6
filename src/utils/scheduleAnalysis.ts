import {
  Activity,
  CalendarNonWorkingPeriod,
  LongestPathChain,
  ParsedProject,
  Relationship,
  RelationshipType,
} from '../types/xer';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // P6 1=Sun..7=Sat
const DAY_MS = 86_400_000;
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

/**
 * Convert Excel/Primavera serial integer day to YYYY-MM-DD
 */
export function excelSerialToIsoDate(serial: number): string | undefined {
  if (!Number.isFinite(serial) || serial < 20000 || serial > 90000) return undefined;
  const d = new Date(EXCEL_EPOCH_UTC + Math.round(serial) * DAY_MS);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function diffCalendarDaysIso(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return Math.round((tb - ta) / DAY_MS);
}

/**
 * Parses Primavera P6 %T CALENDAR `clndr_data` nested expression string.
 * Extracts weekly working/non-working days, non-working holiday/monsoon exceptions,
 * extra working-day overrides, and contiguous non-working periods.
 */
export function parseCalendarData(clndrData?: string, calendarName = ''): {
  workingWeekdays: string[];
  nonWorkingWeekdays: string[];
  exceptionDates: string[];
  extraWorkingDates: string[];
  nonWorkingPeriods: CalendarNonWorkingPeriod[];
} {
  const defaultWorking = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const defaultNonWorking = ['Sun', 'Sat'];

  if (!clndrData || !clndrData.trim()) {
    return {
      workingWeekdays: defaultWorking,
      nonWorkingWeekdays: defaultNonWorking,
      exceptionDates: [],
      extraWorkingDates: [],
      nonWorkingPeriods: [],
    };
  }

  // 1. Parse DaysOfWeek block: (0||DaysOfWeek()(0||1()...) ... (0||7()...))
  const workingSet = new Set<number>();
  const nonWorkingSet = new Set<number>();
  const daysIdx = clndrData.indexOf('DaysOfWeek');
  if (daysIdx >= 0) {
    const excIdx = clndrData.indexOf('Exceptions', daysIdx);
    const daysSegment = excIdx > daysIdx ? clndrData.slice(daysIdx, excIdx) : clndrData.slice(daysIdx);

    // Match each weekday block (0||<1..7> ... up to next (0||<1..7> or end)
    for (let dayNum = 1; dayNum <= 7; dayNum++) {
      const marker = `(0||${dayNum}(`;
      const startPos = daysSegment.indexOf(marker);
      if (startPos >= 0) {
        // Walk balanced parentheses from startPos
        let depth = 0;
        let endPos = startPos;
        for (let i = startPos; i < daysSegment.length; i++) {
          if (daysSegment[i] === '(') depth++;
          else if (daysSegment[i] === ')') {
            depth--;
            if (depth === 0) {
              endPos = i;
              break;
            }
          }
        }
        const dayBlock = daysSegment.slice(startPos, endPos + 1);
        if (dayBlock.includes('(s|')) {
          workingSet.add(dayNum);
        } else {
          nonWorkingSet.add(dayNum);
        }
      }
    }
  }

  const workingWeekdays: string[] = [];
  const nonWorkingWeekdays: string[] = [];
  if (workingSet.size > 0 || nonWorkingSet.size > 0) {
    for (let d = 1; d <= 7; d++) {
      const label = DAY_NAMES[d - 1];
      if (workingSet.has(d)) workingWeekdays.push(label);
      else nonWorkingWeekdays.push(label);
    }
  } else {
    workingWeekdays.push(...defaultWorking);
    nonWorkingWeekdays.push(...defaultNonWorking);
  }

  // 2. Parse Exceptions block: entries with (d|<serial>)
  const exceptionSet = new Set<string>();
  const extraWorkSet = new Set<string>();

  const excStart = clndrData.indexOf('Exceptions');
  const excSegment = excStart >= 0 ? clndrData.slice(excStart) : clndrData;

  const dateTokenRegex = /\(d\|(\d{4,6})\)/g;
  let match: RegExpExecArray | null;
  while ((match = dateTokenRegex.exec(excSegment)) !== null) {
    const serial = parseInt(match[1], 10);
    const iso = excelSerialToIsoDate(serial);
    if (!iso) continue;

    // Inspect the enclosing exception node (0||0(d|SERIAL)...) to see if it defines work shifts (s|...)
    const searchBackStart = Math.max(0, match.index - 12);
    const nodeStart = excSegment.lastIndexOf('(0||', match.index);
    let hasShift = false;
    if (nodeStart >= searchBackStart - 20 && nodeStart >= 0) {
      let depth = 0;
      let nodeEnd = match.index + match[0].length;
      for (let i = nodeStart; i < excSegment.length; i++) {
        if (excSegment[i] === '(') depth++;
        else if (excSegment[i] === ')') {
          depth--;
          if (depth === 0) {
            nodeEnd = i;
            break;
          }
        }
      }
      const nodeText = excSegment.slice(nodeStart, nodeEnd + 1);
      hasShift = nodeText.includes('(s|');
    }

    if (hasShift) {
      extraWorkSet.add(iso);
    } else {
      exceptionSet.add(iso);
    }
  }

  const exceptionDates = Array.from(exceptionSet).sort();
  const extraWorkingDates = Array.from(extraWorkSet).sort();

  // 3. Group consecutive or weekend-bridged exception dates into periods (e.g. Monsoon blocks vs single holidays)
  const nonWorkingPeriods: CalendarNonWorkingPeriod[] = [];
  if (exceptionDates.length > 0) {
    // Allow bridging across up to 3 calendar days if non-working weekdays exist between exception dates
    const bridgeToleranceDays = nonWorkingWeekdays.length > 0 ? 3 : 1;

    let groupStart = exceptionDates[0];
    let groupEnd = exceptionDates[0];
    let groupCount = 1;

    const pushGroup = (start: string, end: string, excCount: number) => {
      const calDays = diffCalendarDaysIso(start, end) + 1;
      const lowerCal = calendarName.toLowerCase();
      let category: CalendarNonWorkingPeriod['category'] = 'Holiday';
      if (calDays >= 7 || excCount >= 6) {
        category = 'Monsoon / Extended Closure';
      } else if (calDays >= 2) {
        category = 'Multi-Day Holiday / Shutdown';
      }

      let label = category === 'Monsoon / Extended Closure'
        ? (lowerCal.includes('monsoon') || lowerCal.includes('rain')
            ? `Monsoon / Weather Non-Working (${calDays}d)`
            : `Extended Non-Working Period (${calDays}d)`)
        : category === 'Multi-Day Holiday / Shutdown'
        ? `Multi-Day Holiday / Closure (${calDays}d)`
        : 'Designated Holiday / Non-Working Day';

      nonWorkingPeriods.push({
        startDate: start,
        endDate: end,
        calendarDays: calDays,
        exceptionDatesCount: excCount,
        category,
        label,
      });
    };

    for (let i = 1; i < exceptionDates.length; i++) {
      const curr = exceptionDates[i];
      const gap = diffCalendarDaysIso(groupEnd, curr);
      if (gap <= bridgeToleranceDays) {
        groupEnd = curr;
        groupCount++;
      } else {
        pushGroup(groupStart, groupEnd, groupCount);
        groupStart = curr;
        groupEnd = curr;
        groupCount = 1;
      }
    }
    pushGroup(groupStart, groupEnd, groupCount);
  }

  return {
    workingWeekdays,
    nonWorkingWeekdays,
    exceptionDates,
    extraWorkingDates,
    nonWorkingPeriods,
  };
}

/**
 * Computes Primary Longest Path (#1) and Subsequent Longest Paths (#2..#10)
 * with validation status and merge detection.
 */
export function computeLongestAndSubsequentPaths(
  activities: Activity[],
  taskMap: Map<string, Activity>,
  maxPaths = 10
): { primaryIds: Set<string>; chains: LongestPathChain[] } {
  if (activities.length === 0) {
    return { primaryIds: new Set(), chains: [] };
  }

  const workActivities = activities.filter((a) => a.type !== 'TT_LOE' && a.type !== 'TT_WBS');
  const pool = workActivities.length > 0 ? workActivities : activities;

  let latestFinish = '';
  for (const a of pool) {
    const fin = a.finishDate || a.earlyFinishDate || '';
    if (fin && (!latestFinish || fin > latestFinish)) {
      latestFinish = fin;
    }
  }

  const chains: LongestPathChain[] = [];
  const claimedInAnyPath = new Set<string>();
  const primaryIds = new Set<string>();
  const actToFirstPathRank = new Map<string, number>();

  const traceChainFromTerminal = (
    startAct: Activity,
    rank: number,
    stopAtClaimed: boolean
  ): {
    ids: string[];
    mergesIntoRank?: number;
    mergesIntoCode?: string;
    hasOpenStart: boolean;
    hasConstraintInterruption: boolean;
  } => {
    const chainIds: string[] = [];
    const visitedLocal = new Set<string>();
    let current: Activity | undefined = startAct;
    let mergesIntoRank: number | undefined;
    let mergesIntoCode: string | undefined;
    let hasOpenStart = false;
    let hasConstraintInterruption = false;

    while (current && !visitedLocal.has(current.id)) {
      if (stopAtClaimed && claimedInAnyPath.has(current.id) && chainIds.length > 0) {
        mergesIntoRank = actToFirstPathRank.get(current.id);
        mergesIntoCode = current.code;
        break;
      }

      visitedLocal.add(current.id);
      chainIds.push(current.id);

      if (current.constraintType && ['MAND', 'MUST', 'CS_MAND', 'CS_MSO', 'CS_MEO'].some((k) => current!.constraintType!.toUpperCase().includes(k))) {
        hasConstraintInterruption = true;
      }

      if (current.predecessors.length === 0) {
        hasOpenStart = current.type !== 'TT_Mile' && current.startDate !== undefined && !isEarliestStart(current, pool);
        break;
      }

      // Pick best driving predecessor
      let chosenPred: Activity | undefined;
      const validPreds: { rel: Relationship; act: Activity }[] = current.predecessors
        .map((rel) => ({ rel, act: taskMap.get(rel.predTaskId) }))
        .filter((x): x is { rel: Relationship; act: Activity } => !!x.act && !visitedLocal.has(x.act.id));

      if (validPreds.length === 0) break;

      // Prefer driving flag first
      const drivingCandidates = validPreds.filter((c) => c.rel.driving);
      const candidates = drivingCandidates.length > 0 ? drivingCandidates : validPreds;

      // For primary path (#1), pick predecessor with lowest total float, then latest finish date
      // For subsequent paths (#2+), prefer unvisited predecessor with lowest total float / latest finish
      candidates.sort((a, b) => {
        if (stopAtClaimed) {
          const aClaimed = claimedInAnyPath.has(a.act.id) ? 1 : 0;
          const bClaimed = claimedInAnyPath.has(b.act.id) ? 1 : 0;
          if (aClaimed !== bClaimed) return aClaimed - bClaimed;
        }
        if (a.act.totalFloatDays !== b.act.totalFloatDays) {
          return a.act.totalFloatDays - b.act.totalFloatDays;
        }
        const aFin = a.act.finishDate || '';
        const bFin = b.act.finishDate || '';
        if (aFin !== bFin) return bFin.localeCompare(aFin);
        return b.act.origDurationDays - a.act.origDurationDays;
      });

      chosenPred = candidates[0]?.act;
      current = chosenPred;
    }

    chainIds.reverse(); // Chronological Start -> Finish
    return {
      ids: chainIds,
      mergesIntoRank,
      mergesIntoCode,
      hasOpenStart,
      hasConstraintInterruption,
    };
  };

  // Path #1: Primary Longest Path
  const latestMs = latestFinish ? Date.parse(`${latestFinish}T00:00:00Z`) : 0;
  const terminalCandidates = pool.filter((a) => {
    const fin = a.finishDate || a.earlyFinishDate;
    if (!fin) return false;
    const isTerminal = a.successors.length === 0 || a.type === 'TT_FinMile';
    const finMs = Date.parse(`${fin}T00:00:00Z`);
    return isTerminal && Math.abs(finMs - latestMs) <= DAY_MS * 2;
  });

  const primarySeeds = (terminalCandidates.length > 0
    ? [...terminalCandidates].sort((a, b) => a.totalFloatDays - b.totalFloatDays || (b.finishDate || '').localeCompare(a.finishDate || ''))
    : [...pool].sort((a, b) => (b.finishDate || '').localeCompare(a.finishDate || '') || a.totalFloatDays - b.totalFloatDays));

  if (primarySeeds.length > 0) {
    // Also capture parallel driving branches from all terminal candidates at latest finish
    const primaryMergedIds = new Set<string>();
    const mainTrace = traceChainFromTerminal(primarySeeds[0], 1, false);
    mainTrace.ids.forEach((id) => primaryMergedIds.add(id));

    // Include any co-driving branches from primary terminal candidates (standard P6 longest path trace)
    const queue = terminalCandidates.slice(0, 5).map((t) => t.id);
    const seenPrimary = new Set<string>();
    while (queue.length > 0) {
      const cid = queue.shift()!;
      if (seenPrimary.has(cid)) continue;
      seenPrimary.add(cid);
      primaryMergedIds.add(cid);
      const act = taskMap.get(cid);
      if (!act || act.predecessors.length === 0) continue;
      const drivingPreds = act.predecessors.filter((p) => p.driving);
      const nextPreds = drivingPreds.length > 0
        ? drivingPreds
        : (() => {
            const minF = Math.min(...act.predecessors.map((p) => taskMap.get(p.predTaskId)?.totalFloatDays ?? 99999));
            return act.predecessors.filter((p) => {
              const pa = taskMap.get(p.predTaskId);
              return pa && pa.totalFloatDays <= Math.max(0, minF);
            });
          })();
      for (const p of nextPreds) {
        if (!seenPrimary.has(p.predTaskId)) queue.push(p.predTaskId);
      }
    }

    const orderedPrimary = sortActivitiesChronologically(
      Array.from(primaryMergedIds).map((id) => taskMap.get(id)!).filter(Boolean)
    ).map((a) => a.id);

    orderedPrimary.forEach((id) => {
      primaryIds.add(id);
      claimedInAnyPath.add(id);
      if (!actToFirstPathRank.has(id)) actToFirstPathRank.set(id, 1);
    });

    const pActs = orderedPrimary.map((id) => taskMap.get(id)!).filter(Boolean);
    const pMinFloat = pActs.length > 0 ? Math.min(...pActs.map((a) => a.totalFloatDays)) : 0;
    const pStart = minDateOf(pActs);
    const pFinish = maxDateOf(pActs);
    const pSpan = pStart && pFinish ? Math.max(0, diffCalendarDaysIso(pStart, pFinish)) : 0;

    const validationNotes: string[] = [];
    if (mainTrace.hasOpenStart) validationNotes.push('Chain originates at an activity with no predecessor link.');
    if (mainTrace.hasConstraintInterruption) validationNotes.push('Contains hard date constraint along driving chain.');
    if (validationNotes.length === 0) validationNotes.push('Continuous logic from project start to completion date.');

    chains.push({
      rank: 1,
      name: `Path #1 — Primary Longest Path (TF: ${pMinFloat}d)`,
      isPrimary: true,
      totalFloatDays: pMinFloat,
      floatGapFromPrimaryDays: 0,
      startDate: pStart,
      finishDate: pFinish,
      spanDays: pSpan,
      activityIds: orderedPrimary,
      validationStatus: mainTrace.hasConstraintInterruption
        ? 'Constraint-Interrupted'
        : mainTrace.hasOpenStart
        ? 'Has Open Start'
        : 'Validated Continuous',
      validationNotes,
    });
  }

  // Subsequent Paths (#2 .. maxPaths)
  const primaryFloat = chains[0]?.totalFloatDays ?? 0;

  // Candidate seeds for subsequent paths: incomplete or remaining non-claimed activities sorted by Total Float ASC, Finish DESC
  const remainingCandidates = [...pool]
    .filter((a) => !claimedInAnyPath.has(a.id) && a.status !== 'TK_Complete')
    .sort((a, b) => {
      if (a.totalFloatDays !== b.totalFloatDays) return a.totalFloatDays - b.totalFloatDays;
      const aFin = a.finishDate || '';
      const bFin = b.finishDate || '';
      if (aFin !== bFin) return bFin.localeCompare(aFin);
      return b.origDurationDays - a.origDurationDays;
    });

  // Fallback to all unclaimed if all incomplete are claimed
  const seedQueue = remainingCandidates.length > 0
    ? remainingCandidates
    : [...pool].filter((a) => !claimedInAnyPath.has(a.id)).sort((a, b) => a.totalFloatDays - b.totalFloatDays);

  for (const seed of seedQueue) {
    if (chains.length >= maxPaths) break;
    if (claimedInAnyPath.has(seed.id)) continue;

    // Prefer starting from the latest unclaimed downstream activity in this float band
    let bestSeed = seed;
    const visitedWalk = new Set<string>([seed.id]);
    let walkCur: Activity | undefined = seed;
    while (walkCur) {
      const unclaimedSuccs = walkCur.successors
        .map((s) => taskMap.get(s.taskId))
        .filter((sa): sa is Activity =>
          !!sa &&
          !claimedInAnyPath.has(sa.id) &&
          !visitedWalk.has(sa.id) &&
          sa.type !== 'TT_LOE' &&
          sa.type !== 'TT_WBS' &&
          Math.abs(sa.totalFloatDays - seed.totalFloatDays) <= 2
        )
        .sort((a, b) => (b.finishDate || '').localeCompare(a.finishDate || ''));

      if (unclaimedSuccs.length === 0) break;
      walkCur = unclaimedSuccs[0];
      visitedWalk.add(walkCur.id);
      bestSeed = walkCur;
    }

    const rank = chains.length + 1;
    const trace = traceChainFromTerminal(bestSeed, rank, true);
    if (trace.ids.length === 0) continue;

    const orderedIds = sortActivitiesChronologically(
      trace.ids.map((id) => taskMap.get(id)!).filter(Boolean)
    ).map((a) => a.id);

    orderedIds.forEach((id) => {
      claimedInAnyPath.add(id);
      if (!actToFirstPathRank.has(id)) actToFirstPathRank.set(id, rank);
    });

    const acts = orderedIds.map((id) => taskMap.get(id)!).filter(Boolean);
    const branchFloat = acts.length > 0 ? Math.min(...acts.map((a) => a.totalFloatDays)) : bestSeed.totalFloatDays;
    const bStart = minDateOf(acts);
    const bFinish = maxDateOf(acts);
    const bSpan = bStart && bFinish ? Math.max(0, diffCalendarDaysIso(bStart, bFinish)) : 0;

    // Check where bestSeed merges downstream if not captured in backward trace
    let mergeRank = trace.mergesIntoRank;
    let mergeCode = trace.mergesIntoCode;
    if (!mergeCode && bestSeed.successors.length > 0) {
      for (const s of bestSeed.successors) {
        const sRank = actToFirstPathRank.get(s.taskId);
        const sAct = taskMap.get(s.taskId);
        if (sRank && sAct) {
          mergeRank = sRank;
          mergeCode = sAct.code;
          break;
        }
      }
    }

    const notes: string[] = [];
    if (mergeCode && mergeRank) {
      notes.push(`Feeds / merges into Path #${mergeRank} via ${mergeCode}.`);
    } else if (bestSeed.successors.length === 0) {
      notes.push('Terminates at an independent open finish or milestone.');
    }
    if (trace.hasOpenStart) notes.push('Originates at an open-start activity (no predecessor).');
    if (trace.hasConstraintInterruption) notes.push('Contains hard constraint along branch.');
    if (notes.length === 0) notes.push('Near-critical driving branch validated through predecessor chain.');

    chains.push({
      rank,
      name: `Path #${rank} — Subsequent Path (TF: ${branchFloat}d)`,
      isPrimary: false,
      totalFloatDays: branchFloat,
      floatGapFromPrimaryDays: Math.round((branchFloat - primaryFloat) * 10) / 10,
      startDate: bStart,
      finishDate: bFinish,
      spanDays: bSpan,
      activityIds: orderedIds,
      mergesIntoPathRank: mergeRank,
      mergesIntoActivityCode: mergeCode,
      validationStatus: trace.hasConstraintInterruption
        ? 'Constraint-Interrupted'
        : trace.hasOpenStart
        ? 'Has Open Start'
        : 'Validated Continuous',
      validationNotes: notes,
    });
  }

  return { primaryIds, chains };
}

function isEarliestStart(act: Activity, pool: Activity[]): boolean {
  if (!act.startDate) return false;
  let earliest = act.startDate;
  for (const p of pool) {
    if (p.startDate && p.startDate < earliest) earliest = p.startDate;
  }
  return diffCalendarDaysIso(earliest, act.startDate) <= 3;
}

function minDateOf(acts: Activity[]): string | undefined {
  let min: string | undefined;
  for (const a of acts) {
    if (a.startDate && (!min || a.startDate < min)) min = a.startDate;
  }
  return min;
}

function maxDateOf(acts: Activity[]): string | undefined {
  let max: string | undefined;
  for (const a of acts) {
    if (a.finishDate && (!max || a.finishDate > max)) max = a.finishDate;
  }
  return max;
}

export function sortActivitiesChronologically(acts: Activity[], mode: 'start' | 'finish' | 'float' = 'start'): Activity[] {
  return [...acts].sort((a, b) => {
    if (mode === 'finish') {
      const af = a.finishDate || '9999-12-31';
      const bf = b.finishDate || '9999-12-31';
      if (af !== bf) return af.localeCompare(bf);
      const as = a.startDate || '9999-12-31';
      const bs = b.startDate || '9999-12-31';
      if (as !== bs) return as.localeCompare(bs);
    } else if (mode === 'float') {
      if (a.totalFloatDays !== b.totalFloatDays) return a.totalFloatDays - b.totalFloatDays;
      const as = a.startDate || '9999-12-31';
      const bs = b.startDate || '9999-12-31';
      if (as !== bs) return as.localeCompare(bs);
    } else {
      const as = a.startDate || '9999-12-31';
      const bs = b.startDate || '9999-12-31';
      if (as !== bs) return as.localeCompare(bs);
      const af = a.finishDate || '9999-12-31';
      const bf = b.finishDate || '9999-12-31';
      if (af !== bf) return af.localeCompare(bf);
    }
    if (a.totalFloatDays !== b.totalFloatDays) return a.totalFloatDays - b.totalFloatDays;
    return a.code.localeCompare(b.code);
  });
}

export interface BackwardPathNode {
  hop: number; // 0 = Target activity/milestone, 1 = Direct pred, etc.
  activity: Activity;
  linkToSuccessorType?: RelationshipType;
  linkToSuccessorLagDays?: number;
  linkToSuccessorCode?: string;
  isDrivingLink: boolean;
  isOnDrivingChain: boolean;
}

export interface BackwardPathTraceResult {
  target: Activity;
  drivingChain: BackwardPathNode[]; // Start -> Target
  allUpstreamNodes: BackwardPathNode[]; // Ordered by Hop asc, Start asc
  openStartNodes: Activity[];
  constrainedNodes: Activity[];
  totalUpstreamCount: number;
}

/**
 * Traces the full backward predecessor network AND the primary driving chain
 * from any target milestone or activity back to project start.
 */
export function traceBackwardPath(
  project: ParsedProject,
  targetActivityId: string,
  maxDepth = 150
): BackwardPathTraceResult | null {
  const taskMap = new Map<string, Activity>();
  for (const a of project.activities) taskMap.set(a.id, a);

  const target = taskMap.get(targetActivityId);
  if (!target) return null;

  // 1. Primary Driving Chain back to start
  const drivingIds = new Set<string>();
  const drivingStepsRev: BackwardPathNode[] = [];
  let cur: Activity | undefined = target;
  let hop = 0;
  const seenDriving = new Set<string>();

  while (cur && !seenDriving.has(cur.id) && hop < maxDepth) {
    seenDriving.add(cur.id);
    drivingIds.add(cur.id);

    const validPreds: { rel: Relationship; pred: Activity }[] = cur.predecessors
      .map((rel) => ({ rel, pred: taskMap.get(rel.predTaskId) }))
      .filter((x): x is { rel: Relationship; pred: Activity } => !!x.pred && !seenDriving.has(x.pred.id));

    let chosen: { rel: Relationship; pred: Activity } | undefined;
    if (validPreds.length > 0) {
      const drivingFlagged = validPreds.filter((c) => c.rel.driving);
      const pool = drivingFlagged.length > 0 ? drivingFlagged : validPreds;
      pool.sort((a, b) => {
        if (a.pred.totalFloatDays !== b.pred.totalFloatDays) return a.pred.totalFloatDays - b.pred.totalFloatDays;
        const aFin = a.pred.finishDate || '';
        const bFin = b.pred.finishDate || '';
        return bFin.localeCompare(aFin);
      });
      chosen = pool[0];
    }

    drivingStepsRev.push({
      hop,
      activity: cur,
      linkToSuccessorType: undefined,
      linkToSuccessorLagDays: undefined,
      linkToSuccessorCode: undefined,
      isDrivingLink: true,
      isOnDrivingChain: true,
    });

    if (chosen && drivingStepsRev.length > 0) {
      // Annotate predecessor node on next iteration; temporarily attach link metadata below
      cur = chosen.pred;
      hop++;
    } else {
      break;
    }
  }

  // Enrich link metadata on driving chain (Start -> Target order)
  const drivingChain = drivingStepsRev.reverse();
  for (let i = 0; i < drivingChain.length - 1; i++) {
    const predNode = drivingChain[i];
    const succNode = drivingChain[i + 1];
    const rel = succNode.activity.predecessors.find((r) => r.predTaskId === predNode.activity.id);
    if (rel) {
      predNode.linkToSuccessorType = rel.type;
      predNode.linkToSuccessorLagDays = rel.lagDays;
      predNode.linkToSuccessorCode = succNode.activity.code;
      predNode.isDrivingLink = rel.driving;
    }
  }

  // 2. Full BFS upstream network
  const allUpstreamNodes: BackwardPathNode[] = [];
  const visitedBfs = new Set<string>([target.id]);
  const bfsQueue: {
    act: Activity;
    hop: number;
    relType?: RelationshipType;
    lagDays?: number;
    succCode?: string;
    driving: boolean;
  }[] = [{ act: target, hop: 0, driving: true }];

  const openStartNodes: Activity[] = [];
  const constrainedNodes: Activity[] = [];

  while (bfsQueue.length > 0 && allUpstreamNodes.length < 600) {
    const item = bfsQueue.shift()!;
    allUpstreamNodes.push({
      hop: item.hop,
      activity: item.act,
      linkToSuccessorType: item.relType,
      linkToSuccessorLagDays: item.lagDays,
      linkToSuccessorCode: item.succCode,
      isDrivingLink: item.driving,
      isOnDrivingChain: drivingIds.has(item.act.id),
    });

    if (item.act.predecessors.length === 0) {
      openStartNodes.push(item.act);
    }
    if (item.act.constraintType) {
      constrainedNodes.push(item.act);
    }

    if (item.hop >= maxDepth) continue;

    for (const rel of item.act.predecessors) {
      if (visitedBfs.has(rel.predTaskId)) continue;
      const predAct = taskMap.get(rel.predTaskId);
      if (!predAct) continue;
      visitedBfs.add(rel.predTaskId);
      bfsQueue.push({
        act: predAct,
        hop: item.hop + 1,
        relType: rel.type,
        lagDays: rel.lagDays,
        succCode: item.act.code,
        driving: rel.driving,
      });
    }
  }

  return {
    target,
    drivingChain,
    allUpstreamNodes,
    openStartNodes,
    constrainedNodes,
    totalUpstreamCount: allUpstreamNodes.length,
  };
}

export interface MilestoneSummaryRow {
  activity: Activity;
  milestoneType: 'Start Milestone' | 'Finish Milestone' | 'Zero-Duration Milestone';
  isContractual: boolean;
  matchedTag: string;
  plannedStart?: string;
  plannedFinish?: string;
  forecastStart?: string;
  forecastFinish?: string;
  varianceDays: number | null;
}

const CONTRACTUAL_MILESTONE_KEYWORDS = [
  'contract',
  'key date',
  'kd-',
  'kd ',
  'ms-',
  'ms ',
  'commencement',
  'ntp',
  'notice to proceed',
  'handover',
  'taking over',
  'toc',
  'substantial completion',
  'completion',
  'cod',
  'commercial operation',
  'sectional',
  'interim',
  'access',
  'possession',
  'right of way',
  'row',
  'employer',
  'client',
  'statutory',
  'approval',
  'commissioning',
  'energization',
  'trial run',
  'defect',
  'dlp',
];

export function extractMilestonesSummary(project: ParsedProject): MilestoneSummaryRow[] {
  const milestones = project.activities.filter(
    (a) => a.type === 'TT_Mile' || a.type === 'TT_FinMile' || (a.type === 'TT_Task' && a.origDurationDays === 0)
  );

  return milestones
    .map((act) => {
      const hay = `${act.code} ${act.name} ${act.wbsPath} ${act.wbsName}`.toLowerCase();
      const matched = CONTRACTUAL_MILESTONE_KEYWORDS.find((kw) => hay.includes(kw));
      const isContractual = Boolean(
        matched ||
          act.constraintType ||
          act.successors.length === 0 ||
          act.predecessors.length === 0 ||
          act.isCritical ||
          act.isLongestPath
      );

      const plannedStart = act.targetStartDate || act.startDate;
      const plannedFinish = act.targetFinishDate || act.finishDate;
      const forecastStart = act.actualStartDate || act.earlyStartDate || act.startDate;
      const forecastFinish = act.actualFinishDate || act.earlyFinishDate || act.finishDate;

      let varianceDays: number | null = null;
      if (plannedFinish && forecastFinish) {
        varianceDays = diffCalendarDaysIso(plannedFinish, forecastFinish);
      }

      const milestoneType: MilestoneSummaryRow['milestoneType'] =
        act.type === 'TT_Mile'
          ? 'Start Milestone'
          : act.type === 'TT_FinMile'
          ? 'Finish Milestone'
          : 'Zero-Duration Milestone';

      return {
        activity: act,
        milestoneType,
        isContractual,
        matchedTag: matched ? matched.toUpperCase() : act.constraintType ? 'Constrained Key Event' : 'Schedule Milestone',
        plannedStart,
        plannedFinish,
        forecastStart,
        forecastFinish,
        varianceDays,
      };
    })
    .sort((a, b) => {
      const da = a.forecastFinish || a.plannedFinish || a.forecastStart || '9999-12-31';
      const db = b.forecastFinish || b.plannedFinish || b.forecastStart || '9999-12-31';
      return da.localeCompare(db) || a.activity.code.localeCompare(b.activity.code);
    });
}

export const DEFAULT_EMPLOYER_OBLIGATION_KEYWORDS = [
  'employer',
  'client',
  'owner',
  'authority',
  'engineer',
  'pmc',
  'right of way',
  'row',
  'land',
  'possession',
  'site handover',
  'site access',
  'free issue',
  'fims',
  'utility',
  'noc',
  'permit',
  'clearance',
  'statutory',
  'approval',
  'review & approve',
  'review and approve',
  'drawing approval',
  'ifc',
  'gfc',
  'customs',
  'power supply',
  'water supply',
  'govt',
  'government',
  'municipal',
  'railway',
  'forest',
  'environmental',
];

export interface EmployerObligationRow {
  activity: Activity;
  matchedKeywords: string[];
  obligationCategory: string;
}

export function extractEmployerObligations(
  project: ParsedProject,
  keywords: string[] = DEFAULT_EMPLOYER_OBLIGATION_KEYWORDS
): EmployerObligationRow[] {
  const cleanKeywords = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (cleanKeywords.length === 0) return [];

  const results: EmployerObligationRow[] = [];

  for (const act of project.activities) {
    const hay = `${act.code} ${act.name} ${act.wbsPath} ${act.wbsName} ${act.calendarName || ''}`.toLowerCase();
    const matched = cleanKeywords.filter((kw) => {
      // Avoid false partial hits on very short keywords like 'row' inside 'borrow' or 'arrow' or 'throw'
      if (kw.length <= 4 && /^[a-z]+$/.test(kw)) {
        const re = new RegExp(`\\b${kw}\\b`, 'i');
        return re.test(hay);
      }
      return hay.includes(kw);
    });

    if (matched.length > 0) {
      let category = 'Employer / Client Obligation';
      if (matched.some((k) => ['row', 'right of way', 'land', 'possession', 'site handover', 'site access'].includes(k))) {
        category = 'Site Access / ROW / Land';
      } else if (matched.some((k) => ['noc', 'permit', 'clearance', 'statutory', 'authority', 'govt', 'government', 'municipal', 'railway', 'forest', 'environmental'].includes(k))) {
        category = 'Statutory Approvals & NOCs';
      } else if (matched.some((k) => ['approval', 'review & approve', 'review and approve', 'drawing approval', 'ifc', 'gfc', 'engineer', 'pmc'].includes(k))) {
        category = 'Design / Drawing Review & Approvals';
      } else if (matched.some((k) => ['utility', 'power supply', 'water supply'].includes(k))) {
        category = 'Utility Shifting & Connections';
      } else if (matched.some((k) => ['free issue', 'fims', 'customs'].includes(k))) {
        category = 'Free-Issue Materials / Customs';
      }

      results.push({
        activity: act,
        matchedKeywords: matched,
        obligationCategory: category,
      });
    }
  }

  return results.sort((a, b) => {
    const da = a.activity.startDate || '9999-12-31';
    const db = b.activity.startDate || '9999-12-31';
    return da.localeCompare(db) || a.activity.code.localeCompare(b.activity.code);
  });
}

/**
 * Clean CSV export helper
 */
export function downloadCsvFile(filename: string, headers: string[], rows: (string | number | undefined | null)[][]) {
  const escapeCell = (val: string | number | undefined | null) => {
    const str = val === undefined || val === null ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
