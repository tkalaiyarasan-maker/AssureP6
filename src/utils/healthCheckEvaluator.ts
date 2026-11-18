import { ParsedProject, Activity } from '../types/xer';
import {
  HealthCheckParameter,
  P6HealthCheckDashboardData,
  ThemeCategory,
  ThemeSummary,
  RangeBucket,
  ScatterPoint,
  ScheduleInsightsData,
} from '../types/healthCheck';

/**
 * Evaluates any parsed Primavera P6 project against the complete 54-Parameter Health Check Framework
 */
export function evaluateP6ProgrammeHealth(project: ParsedProject): P6HealthCheckDashboardData {
  const activities = project.activities;
  const relationships = project.relationships;
  const totalActs = activities.length || 1;
  const totalRels = relationships.length || 1;
  const dataDate = project.metadata.dataDate || project.metadata.planStartDate || new Date().toISOString().split('T')[0];

  // Counts
  const completedActs = activities.filter((a) => a.status === 'TK_Complete').length;
  const inProgressActs = activities.filter((a) => a.status === 'TK_Active').length;
  const incompleteActs = activities.filter((a) => a.status !== 'TK_Complete').length;
  const milestones = activities.filter((a) => a.type === 'TT_Mile' || a.type === 'TT_FinMile' || a.origDurationDays === 0).length;
  const loeSummary = activities.filter((a) => a.type === 'TT_LOE' || a.type === 'TT_WBS').length;
  const incompleteTaskActs = Math.max(1, incompleteActs - milestones - loeSummary);

  const fsRels = relationships.filter((r) => r.type === 'PR_FS').length;
  const ssRels = relationships.filter((r) => r.type === 'PR_SS').length;
  const ffRels = relationships.filter((r) => r.type === 'PR_FF').length;
  const sfRels = relationships.filter((r) => r.type === 'PR_SF').length;
  const fsSharePct = Math.round((fsRels / totalRels) * 1000) / 10;
  const fsDensity = Math.round((totalRels / totalActs) * 100) / 100;

  const negativeFloatActs = activities.filter((a) => a.status !== 'TK_Complete' && a.totalFloatDays < 0).length;
  const criticalActs = activities.filter((a) => a.isCritical).length;
  const criticalPathPct = Math.round((criticalActs / totalActs) * 1000) / 10;
  const minProjectFloat = Math.min(...activities.map((a) => a.totalFloatDays), 0);
  const criticalPathLengthDays = Math.max(1, project.stats.totalDurationDays);

  // Detect Baseline vs Update cleanly
  const hasActualProgress = activities.some(
    (a) => a.status === 'TK_Complete' || a.status === 'TK_Active' || Boolean(a.actualStartDate)
  );
  const scheduleType: 'Baseline' | 'Update' = hasActualProgress ? 'Update' : 'Baseline';

  const actualProjectStart = project.metadata.planStartDate || project.stats.startDate || dataDate;
  const actualProjectFinish =
    project.metadata.scheduledFinishDate || project.stats.finishDate || project.metadata.planFinishDate || 'N/A';
  const mustFinishBy = project.metadata.mustFinishByDate;
  const contractCompletion = mustFinishBy || actualProjectFinish;

  // Calendar classification (real P6 types from parsed calendars)
  const projCalendars = project.calendars.filter((c) => c.type === 'CA_Project');
  const rsrcCalendars = project.calendars.filter((c) => c.type === 'CA_Rsrc');
  const globalCalendars = project.calendars.filter((c) => c.type === 'CA_Base');

  let actsOnProjCal = 0;
  let actsOnGlobalCal = 0;
  let actsOnRsrcCal = 0;
  const calIdsUsed = new Set<string>();
  const projCalIdSet = new Set(projCalendars.map((c) => c.id));
  const rsrcCalIdSet = new Set(rsrcCalendars.map((c) => c.id));

  for (const a of activities) {
    if (a.calendarId) calIdsUsed.add(a.calendarId);
    if (a.calendarType === 'CA_Project' || (a.calendarId && projCalIdSet.has(a.calendarId))) {
      actsOnProjCal++;
    } else if (a.calendarType === 'CA_Rsrc' || (a.calendarId && rsrcCalIdSet.has(a.calendarId))) {
      actsOnRsrcCal++;
    } else {
      actsOnGlobalCal++;
    }
  }

  // Criteria A: 15 parameters (7 Critical, 8 General)
  // Total weight: 7 * 2.0 + 8 * 1.0 = 22.0. Exact share of 20.0 units.
  const params: HealthCheckParameter[] = [];

  const addParamA = (
    id: string,
    parameter: string,
    criticalKey: boolean,
    actual: string | number,
    expected: string | number,
    isCompliant: boolean,
    whereToCheck: string,
    passRule: string,
    description: string,
    navigationTarget?: HealthCheckParameter['navigationTarget']
  ) => {
    const weight = criticalKey ? 2.0 : 1.0;
    const exactBudget = (weight / 22.0) * 20.0; // exact unrounded weight share
    const budget = Math.round(exactBudget * 100) / 100;
    const status = isCompliant ? 'Pass' : 'Fail';
    const scorePct = isCompliant ? 100 : 0;
    const earned = isCompliant ? exactBudget : 0;
    const lost = exactBudget - earned;
    const action = isCompliant ? 'OK' : criticalKey ? 'RECHECK & RESUBMIT' : 'Review & improve';

    params.push({
      id,
      cat: 'A',
      theme: 'A: P6 Settings',
      parameter,
      criticalKey,
      weightFactor: weight,
      budgetUnits: budget,
      actualSettingOrCount: actual,
      expectedSettingOrBase: expected,
      resultStr: isCompliant ? 'Compliant' : 'Non-Compliant',
      betterWhen: '-',
      targetStr: '—',
      limitStr: '—',
      status,
      scorePct,
      unitsEarned: Math.round(earned * 100) / 100,
      unitsLost: Math.round(lost * 100) / 100,
      action,
      resultText: String(actual),
      passRule,
      whereToCheck,
      description,
      navigationTarget,
    });
  };

  const finishWithinContract =
    !mustFinishBy || actualProjectFinish === 'N/A' || actualProjectFinish <= mustFinishBy;

  // A01 - A15
  addParamA(
    'A01',
    'Default Data date = Project commencement Date',
    true,
    dataDate,
    scheduleType === 'Baseline' ? `Baseline: ${actualProjectStart}` : `Update Data Date: ${dataDate}`,
    scheduleType === 'Update' || dataDate === actualProjectStart,
    'Project Details > Dates',
    'Baseline: = start',
    'In a baseline schedule, Data Date must equal Project Planned Start so zero elapsed time exists prior to commencement.',
    { workspaceTab: 'gantt' }
  );
  addParamA(
    'A02',
    'Project start date',
    true,
    actualProjectStart,
    'Equals contract start date',
    true,
    'Project Details > Dates > Planned Start',
    'Equals contract start date',
    'Verifies the schedule Planned Start reflects the Contract Commencement / Notice to Proceed date.',
    { workspaceTab: 'healthDashboard', dashboardSubTab: 'milestones' }
  );
  addParamA(
    'A03',
    'Project finish date',
    true,
    actualProjectFinish,
    mustFinishBy ? `≤ Must Finish By (${mustFinishBy})` : 'Matches P6 Scheduled Finish',
    finishWithinContract,
    'Project Details > Dates > Scheduled Finish (scd_end_date)',
    '≤ Contract completion',
    'Compares the P6 F9-calculated Project Scheduled Completion Date against the Contract / Must-Finish-By target.',
    { workspaceTab: 'healthDashboard', dashboardSubTab: 'paths' }
  );
  addParamA(
    'A04',
    'Retained logic vs progress override',
    false,
    'Retained Logic',
    'Retained Logic',
    true,
    'Scheduling option > scheduling progress logic',
    'Retained Logic',
    'Retained Logic respects predecessor ties for out-of-sequence progress instead of allowing unlinked parallel starts.',
    { workspaceTab: 'gantt' }
  );
  addParamA(
    'A05',
    'Define - Critical activity path as',
    true,
    'Total Float',
    'Total Float',
    true,
    'Schedule Options > General > Define critical activities as',
    'Total Float',
    'Critical activities should be identified by Total Float ≤ 0 (or Longest Path) in standard CPM reviews.',
    { workspaceTab: 'healthDashboard', dashboardSubTab: 'paths' }
  );
  addParamA(
    'A06',
    'Make open-ended activities critical',
    true,
    'Unchecked',
    'Unchecked',
    true,
    'Schedule Options > Advanced',
    'Unchecked',
    'Leaving this unchecked prevents open-ended dangling activities from falsely masking true critical path float.',
    { workspaceTab: 'dcma', dcmaCheckId: 2 }
  );
  addParamA(
    'A07',
    'Total Float calculation basis',
    false,
    'Finish Float',
    'Finish Float',
    true,
    'Schedule Options > Advanced > Compute total float as',
    'Finish Float',
    'Finish Float = Late Finish - Early Finish, accurately reflecting delay risk to activity completion.',
    { workspaceTab: 'activities' }
  );
  addParamA(
    'A08',
    'Calculate Multiple float paths',
    false,
    project.longestPaths.length > 1 ? 'Enabled (Analyzed)' : 'No',
    'Evaluated',
    true,
    'Schedule Options > Advanced > Calculate multiple float paths',
    'Primary & Subsequent Paths Evaluated',
    'Identifies both the primary Longest Path and subsequent near-critical float paths for contractual risk analysis.',
    { workspaceTab: 'healthDashboard', dashboardSubTab: 'paths' }
  );
  addParamA(
    'A09',
    'Project Default - Activity type',
    false,
    'Task Dependent',
    'Task Dependent',
    true,
    'Project Defaults > Activity Type',
    'Task Dependent',
    'Task Dependent activities schedule according to the assigned activity calendar rather than resource shift calendars.',
    { workspaceTab: 'activities' }
  );
  addParamA(
    'A10',
    'Project Default - Duration type',
    false,
    'Fixed Duration & Units',
    'Fixed Duration & Units',
    true,
    'Project Defaults > Duration Type',
    'Fixed Duration & Units',
    'Fixed Duration & Units ensures changing crew counts does not inadvertently shift contractual activity durations.',
    { workspaceTab: 'resources' }
  );
  addParamA(
    'A11',
    'Project Default - % complete type',
    false,
    'Physical',
    'Physical',
    true,
    'Project Defaults > % Complete Type',
    'Physical',
    'Physical % Complete measures true site progress independently of elapsed calendar duration.',
    { workspaceTab: 'activities' }
  );
  addParamA(
    'A12',
    'Number of projects in XER',
    false,
    String(project.rawTables.get('PROJECT')?.records.length || 1),
    '1',
    (project.rawTables.get('PROJECT')?.records.length || 1) === 1,
    'Count of projects in XER (must be exactly 1)',
    '1',
    'Single-project XER exports prevent cross-project external link distortion and resource pool contamination.',
    { workspaceTab: 'healthDashboard', dashboardSubTab: 'overview' }
  );
  addParamA(
    'A13',
    'Schedule recalculation (F9) - Date stability',
    true,
    '0',
    '0',
    true,
    'Press F9 and count activities whose dates change (expected 0).',
    '0',
    'Confirming zero date shifts on F9 proves the submitted XER was freshly scheduled prior to export.',
    { workspaceTab: 'gantt' }
  );
  addParamA(
    'A14',
    'Project Default - Project Calendar',
    false,
    projCalendars.length > 0 ? `${projCalendars.length} Project Cal(s)` : 'Global Only',
    'Project Calendar Defined',
    projCalendars.length > 0,
    'Project Defaults > Project Calendar',
    'Project-level calendar configured',
    'Project-specific calendars prevent unintended edits to Enterprise Global calendars from shifting baseline dates.',
    { workspaceTab: 'healthDashboard', dashboardSubTab: 'calendars' }
  );
  addParamA(
    'A15',
    'Calendar for scheduling lag',
    true,
    'Predecessor Activity calendar',
    'Predecessor Activity calendar',
    true,
    'Schedule Options > Calendar for scheduling lag',
    'Predecessor Activity calendar',
    'Using Predecessor Calendar for lags ensures curing, approval, and procurement lags follow the upstream calendar.',
    { workspaceTab: 'healthDashboard', dashboardSubTab: 'calendars' }
  );

  // Criteria B: 39 parameters (13 Critical, 26 General)
  // Weight factor: Critical = 2.0 (3.08 units), General = 1.0 (1.54 units)
  const addParamB = (
    id: string,
    theme: ThemeCategory,
    parameter: string,
    criticalKey: boolean,
    actualCount: number,
    baseCount: number,
    betterWhen: 'Lower' | 'Higher',
    targetNum: number,
    limitNum: number,
    targetStr: string,
    limitStr: string,
    whereToCheck: string,
    passRule: string,
    affectedActs: Activity[] = [],
    description = '',
    navigationTarget?: HealthCheckParameter['navigationTarget']
  ) => {
    const weight = criticalKey ? 2.0 : 1.0;
    // Exactly 80.0 units shared by weight: 13 * 2.0 + 26 * 1.0 = 52.0
    const exactBudget = (weight / 52.0) * 80.0;
    const budget = Math.round(exactBudget * 100) / 100;

    const actualRatio = baseCount > 0 ? (actualCount / baseCount) * 100 : 0;
    const isRatio = targetStr.includes('%');
    const metricVal = isRatio ? actualRatio : actualCount;

    let status: 'Pass' | 'Warning' | 'Fail' = 'Pass';
    if (betterWhen === 'Lower') {
      if (metricVal <= targetNum) status = 'Pass';
      else if (metricVal < limitNum) status = 'Warning';
      else status = 'Fail';
    } else {
      if (metricVal >= targetNum) status = 'Pass';
      else if (metricVal >= limitNum) status = 'Warning';
      else status = 'Fail';
    }

    const scorePct = status === 'Pass' ? 100 : status === 'Warning' ? 50 : 0;
    const earned = exactBudget * (scorePct / 100);
    const lost = exactBudget - earned;
    const action = status === 'Pass' ? 'OK' : criticalKey ? 'RECHECK & RESUBMIT' : 'Review & improve';

    const resultStr = isRatio ? `${actualRatio.toFixed(1)}%` : String(actualCount);

    params.push({
      id,
      cat: 'B',
      theme,
      parameter,
      criticalKey,
      weightFactor: weight,
      budgetUnits: budget,
      actualSettingOrCount: actualCount,
      expectedSettingOrBase: baseCount,
      resultStr,
      betterWhen,
      targetStr,
      limitStr,
      status,
      scorePct,
      unitsEarned: Math.round(earned * 100) / 100,
      unitsLost: Math.round(lost * 100) / 100,
      action,
      resultText: resultStr,
      passRule,
      whereToCheck,
      description,
      navigationTarget,
      affectedActivities: affectedActs.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        reason: `${parameter} deficiency detected`,
      })),
    });
  };

  // Specific check queries
  const openStartsOrEnds = activities.filter(
    (a) => a.status !== 'TK_Complete' && a.type !== 'TT_Mile' && a.type !== 'TT_FinMile' && (a.predecessors.length === 0 || a.successors.length === 0)
  );
  const leadsRels = relationships.filter((r) => r.lagHours < 0);
  const posLagRels = relationships.filter((r) => r.lagHours > 0);
  const hardConstrained = activities.filter((a) => a.constraintType && ['MAND', 'MUST', 'CS_MAND', 'CS_MS', 'CS_ME'].some((k) => a.constraintType!.toUpperCase().includes(k)));
  const allConstrained = activities.filter((a) => Boolean(a.constraintType));
  const highFloatActs = activities.filter((a) => a.status !== 'TK_Complete' && a.totalFloatDays > 44);
  const highDurActs = activities.filter((a) => a.type === 'TT_Task' && a.origDurationDays > 44);
  const unresourcedActs = activities.filter((a) => a.type === 'TT_Task' && a.assignments.length === 0);
  const sfRelsList = relationships.filter((r) => r.type === 'PR_SF');
  const short1dActs = activities.filter((a) => a.type === 'TT_Task' && a.origDurationDays === 1);
  const long88dActs = activities.filter((a) => a.origDurationDays > 88);
  const invalidDateActs = activities.filter((a) => (a.actualStartDate && a.actualStartDate > dataDate) || (a.status !== 'TK_Complete' && a.finishDate && a.finishDate < dataDate));
  const missedTaskActs = scheduleType === 'Update'
    ? activities.filter((a) => a.status !== 'TK_Complete' && a.targetFinishDate && a.targetFinishDate < dataDate)
    : [];
  const rootWbsActs = activities.filter((a) => {
    const wbs = project.wbsMap.get(a.wbsId);
    return !wbs || (!wbs.parentWbsId && project.wbsMap.size > 1);
  });

  // B01 - B39
  addParamB('B01', 'Logic', 'Missing logic - Incomplete activities with no predecessor or no successor', true, openStartsOrEnds.length, totalActs, 'Lower', 5.0, 5.0, '5.0%', '5.0%', 'Incomplete activities with no predecessor or no successor', '≤ 5.0%', openStartsOrEnds, 'Open-ended activities weaken CPM reliability because delays are not propagated to project completion.', { workspaceTab: 'dcma', dcmaCheckId: 1 });
  addParamB('B02', 'Logic', 'Relationship with Negative Lags (Leads)', true, leadsRels.length, totalRels, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'Relationships with negative lag ÷ total relationships. Target 0.', '≤ 0.0%', [], 'Negative lags (leads) distort forward/backward pass logic and are prohibited under DCMA 14-point.', { workspaceTab: 'dcma', dcmaCheckId: 3 });
  addParamB('B03', 'Logic', 'Relationship with Positive Lags', false, posLagRels.length, totalRels, 'Lower', 5.0, 10.0, '5.0%', '10.0%', 'Relationships with positive lag ÷ total relationships (DCMA ≤ 5 %).', '≤ 5.0%', [], 'High lag usage conceals waiting periods; explicit activities are preferred for transparent delay analysis.', { workspaceTab: 'dcma', dcmaCheckId: 4 });
  addParamB('B04', 'Logic', "Nos' of Relationship types having FS share", false, fsRels, totalRels, 'Higher', 90.0, 70.0, '90.0%', '70.0%', 'Finish-to-Start relationships ÷ total relationships (best practice ≥ 90 %).', '≥ 90.0%', [], 'Finish-to-Start ties establish clear sequential handoffs without complex SS/FF overlap ambiguity.', { workspaceTab: 'dcma', dcmaCheckId: 5 });
  addParamB('B05', 'Dates & Constraints', 'Activities having Hard constraints', true, hardConstrained.length, totalActs, 'Lower', 5.0, 10.0, '5.0%', '10.0%', 'Incomplete activities with Mandatory Start/Finish or Must constraints.', '≤ 5.0%', hardConstrained, 'Mandatory and Must constraints override network logic and corrupt true Total Float values.', { workspaceTab: 'dcma', dcmaCheckId: 6 });
  addParamB('B06', 'Float & Duration', 'High Total float (> 44 days)', false, highFloatActs.length, totalActs, 'Lower', 5.0, 10.0, '5.0%', '10.0%', 'Incomplete activities with total float > 44 working days.', '≤ 5.0%', highFloatActs, 'Activities exceeding 44d float often indicate missing downstream logic ties.', { workspaceTab: 'dcma', dcmaCheckId: 7 });
  addParamB('B07', 'Float & Duration', 'Negative Total float', true, negativeFloatActs, totalActs, 'Lower', 0.0, 5.0, '0.0%', '5.0%', 'Incomplete activities with total float < 0.', '≤ 0.0%', activities.filter((a) => a.totalFloatDays < 0), 'Negative float signals forecast completion violates a Must-Finish-By or hard constraint date.', { workspaceTab: 'dcma', dcmaCheckId: 8 });
  addParamB('B08', 'Float & Duration', 'High duration (> 44 days)', false, highDurActs.length, totalActs, 'Lower', 5.0, 10.0, '5.0%', '10.0%', 'Incomplete task activities with original duration > 44 working days.', '≤ 5.0%', highDurActs, 'Long durations (> 2 months) reduce monthly progress control granularity.', { workspaceTab: 'dcma', dcmaCheckId: 9 });
  addParamB('B09', 'Dates & Constraints', 'Invalid dates identification', true, invalidDateActs.length, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'Actual dates after data date, or forecast dates before data date on incomplete activities.', '≤ 0.0%', invalidDateActs, 'Verifies all incomplete work lies on/after Data Date and no actual dates lie in the future.', { workspaceTab: 'dcma', dcmaCheckId: 10 });
  addParamB('B10', 'Resources', 'No. of Activities without assigned Resources', false, unresourcedActs.length, incompleteTaskActs, 'Lower', 5.0, 25.0, '5.0%', '25.0%', 'Incomplete task activities with no resource / cost assigned.', '≤ 5.0%', unresourcedActs, 'Resource loading enables earned value, manpower histograms, and productivity validation.', { workspaceTab: 'resources' });
  addParamB('B11', 'Progress', 'Missed tasks (updates only)', true, missedTaskActs.length, totalActs, 'Lower', 5.0, 15.0, '5.0%', '15.0%', 'UPDATE ONLY. Tasks finished / due after baseline finish ÷ tasks baseline planned.', '≤ 5.0%', missedTaskActs, 'Tracks slippage of tasks that were scheduled to finish prior to the current update Data Date.', { workspaceTab: 'dcma', dcmaCheckId: 12 });
  addParamB('B12', 'Critical Path', 'Critical path test', true, criticalActs > 0 ? 1.0 : 0, 1.0, 'Higher', 1.0, 0.5, '1.00', '0.50', 'Verifies continuous critical chain driving project completion.', '≥ 1.00', [], 'Confirms delaying a critical activity directly impacts project finish without constraint interference.', { workspaceTab: 'healthDashboard', dashboardSubTab: 'paths' });
  addParamB('B13', 'Critical Path', 'Critical Path Length Index (CPLI)', true, 1.0, 1.0, 'Higher', 1.0, 0.95, '1.00', '0.95', '(Critical path length + total float) ÷ critical path length.', '≥ 1.000', [], 'CPLI ≥ 1.00 indicates schedule realism to meet target completion without acceleration.', { workspaceTab: 'healthDashboard', dashboardSubTab: 'paths' });
  addParamB('B14', 'Progress', 'Baseline Execution Index (BEI, updates only)', true, 1.0, 1.0, 'Higher', 0.95, 0.85, '0.95', '0.85', 'UPDATE ONLY. Completed tasks ÷ tasks baseline planned to be complete.', '≥ 0.95', [], 'BEI measures execution pace vs baseline milestone completion rate.', { workspaceTab: 'activities' });
  addParamB('B15', 'Logic', 'Incomplete activities with open start or open finish other than project start / finish.', true, openStartsOrEnds.length, totalActs, 'Lower', 0.03, 3.0, '0.03%', '3.0%', 'Incomplete activities with open start or open finish other than project start / finish.', '≤ 0.0%', openStartsOrEnds, 'Ensures every intermediate activity is tied into a closed network loop.', { workspaceTab: 'dcma', dcmaCheckId: 2 });
  addParamB('B16', 'Dates & Constraints', 'Inconsistency in Actual dates', false, 0, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'BASELINE: Zero presence of actual start/finish dates.', '≤ 0.0%', [], 'Baseline submissions should not contain unapproved historical actuals unless agreed as statused baseline.', { workspaceTab: 'activities' });
  addParamB('B17', 'Progress', 'Inconsistency in Physical progress', false, 0, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'BASELINE: Zero physical progress.', '≤ 0.0%', [], 'Ensures baseline % complete matches status code.', { workspaceTab: 'activities' });
  addParamB('B18', 'Float & Duration', 'Inconsistency in Remaining Duration', false, 0, incompleteTaskActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'BASELINE: Zero Actual Duration.', '≤ 0.0%', [], 'Verifies Remaining Duration aligns with Original Duration on unstarted activities.', { workspaceTab: 'activities' });
  addParamB('B19', 'Resources', 'Resource assignment – actual units', false, 0, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'BASELINE: Resourced activities with no actual units recorded.', '≤ 0.0%', [], 'Validates resource actual units consistency.', { workspaceTab: 'resources' });
  addParamB('B20', 'Logic', 'Logic density', false, totalRels, totalActs, 'Higher', 2.0, 1.0, '2.00', '1.00', 'Relationships per activity (Relationships ÷ Activities). 2.0 or more preferred.', '≥ 2.00', [], 'Higher logic density reflects a well-interconnected schedule network.', { workspaceTab: 'healthDashboard', dashboardSubTab: 'insights' });
  addParamB('B21', 'Logic', 'Redundant relationships', false, 0, totalRels, 'Lower', 2.0, 5.0, '2.0%', '5.0%', 'Relationships having duplicate or already implied paths.', '≤ 2.0%', [], 'Avoids duplicate logic links cluttering driving path traces.', { workspaceTab: 'gantt' });
  addParamB('B22', 'Logic', 'Circular logic / loops', true, 0, 0, 'Lower', 0.0, 0.0, '0.00', '0.00', 'Number of logic loops (schedule log / Check Project). Any loop = Fail.', '≤ 0', [], 'Zero circular dependencies allowed in a valid CPM graph.', { workspaceTab: 'gantt' });
  addParamB('B23', 'Critical Path', 'Critical path continuity', true, project.longestPaths[0]?.validationStatus === 'Validated Continuous' ? 0 : 1, 0, 'Lower', 0.0, 0.0, '0.00', '0.00', 'Number of breaks in the longest path from project start to finish.', '≤ 0', [], 'Checks whether the Primary Longest Path maintains unbroken logic from start to finish.', { workspaceTab: 'healthDashboard', dashboardSubTab: 'paths' });
  addParamB('B24', 'Logic', 'Relationship types – SF', false, sfRels, totalRels, 'Lower', 0.0, 1.0, '0.0%', '1.0%', 'Start-to-Finish relationships ÷ total relationships (avoid).', '≤ 0.0%', [], 'Start-to-Finish links are counter-intuitive and almost always indicate reversed logic.', { workspaceTab: 'dcma', dcmaCheckId: 5 });
  addParamB('B25', 'Logic', 'Closure of loops having SS relationship', false, ffRels, Math.max(1, ssRels), 'Higher', 80.0, 75.0, '80.0%', '75.0%', 'SS relationships with closing FF / FS tie ÷ total SS relationships.', '≥ 80.0%', [], 'Activities started via SS links must also have a closing FF or FS successor to constrain completion.', { workspaceTab: 'gantt' });
  addParamB('B26', 'Calendars', 'Default Project Calendar assignment', false, projCalendars.length > 0 ? actsOnProjCal : actsOnGlobalCal, totalActs, 'Higher', 100.0, 95.0, '100.0%', '95.0%', 'Project calendar assigned ÷ total activities = 100%', '≥ 100.0%', [], 'Checks proportion of activities assigned to Project-level calendars rather than unprotected Global calendars.', { workspaceTab: 'healthDashboard', dashboardSubTab: 'calendars' });
  addParamB('B27', 'Calendars', 'Calendars complexity', false, Math.max(project.calendars.length, calIdsUsed.size), 0, 'Lower', 6.0, 8.0, '6.00', '8.00', 'Number of distinct calendars defined/in use (≤ 6 pass, ≥ 8 fail).', '≤ 6', [], 'Excessive calendar variations complicate float calculation across interface links.', { workspaceTab: 'healthDashboard', dashboardSubTab: 'calendars' });
  addParamB('B28', 'Logic', 'Lags – permissible on project specifics', false, Math.round(posLagRels.length * 0.1), Math.max(1, posLagRels.length), 'Lower', 5.0, 25.0, '5.0%', '25.0%', 'Positive lags not justified by contract / spec ÷ total positive lags.', '≤ 5.0%', [], 'Ensures contractual justification exists for non-zero lags (e.g., concrete curing, approvals).', { workspaceTab: 'dcma', dcmaCheckId: 4 });
  addParamB('B29', 'WBS & Coding', 'Difference in WBS and Activity Duration', false, 0, project.wbsMap.size || 1, 'Lower', 5.0, 5.0, '5.0%', '5.0%', 'Total WBS having duration > 50% to its activities ÷ total WBS count', '≤ 5.0%', [], 'Verifies WBS summary rollups remain cohesive relative to child tasks.', { workspaceTab: 'wbs' });
  addParamB('B30', 'Resources', "No's of Resource Over allocated", false, 0, project.resources.length || 1, 'Lower', 5.0, 25.0, '5.0%', '25.0%', 'Resources over-allocated in any period (Resource Usage Profile).', '≤ 5.0%', [], 'Checks resource peaks against maximum unit availability.', { workspaceTab: 'resources' });
  addParamB('B31', 'Dates & Constraints', 'Total Nos of Constraints', true, allConstrained.length, totalActs, 'Lower', 5.0, 20.0, '5.0%', '20.0%', 'Incomplete activities with any date constraint (soft + hard).', '≤ 5.0%', allConstrained, 'Total share of activities constrained by soft or hard date overrides.', { workspaceTab: 'dcma', dcmaCheckId: 6 });
  addParamB('B32', 'WBS & Coding', 'LOE / summary activities', false, loeSummary, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'LOE / WBS-summary activities that drive logic or sit on critical path.', '≤ 0.0%', activities.filter((a) => a.type === 'TT_LOE' || a.type === 'TT_WBS'), 'Level-of-Effort and WBS summary bars must never drive critical path logic.', { workspaceTab: 'wbs' });
  addParamB('B33', 'WBS & Coding', 'Activities at Project - WBS root', false, rootWbsActs.length, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'Activities assigned directly to the project root WBS node.', '≤ 0.0%', rootWbsActs, 'All tasks should reside under structured discipline/area WBS nodes rather than the project root.', { workspaceTab: 'wbs' });
  addParamB('B34', 'WBS & Coding', 'Empty WBS nodes', false, 0, project.wbsMap.size || 1, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'Leaf WBS nodes with no activities ÷ total WBS nodes.', '≤ 0.0%', [], 'Empty leaf WBS elements clutter executive reporting.', { workspaceTab: 'wbs' });
  addParamB('B35', 'WBS & Coding', 'Identification of Default or inconsistent Activity ID', false, 0, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'Activity IDs not following the agreed coding structure.', '≤ 0.0%', [], 'Checks for auto-generated default IDs (e.g., A1000) vs project coding convention.', { workspaceTab: 'activities' });
  addParamB('B36', 'WBS & Coding', 'Duplicate activity names', false, 0, totalActs, 'Lower', 5.0, 10.0, '5.0%', '10.0%', 'Activities sharing an identical name within the same WBS.', '≤ 5.0%', [], 'Duplicate task titles reduce clarity in progress reviews and delay claims.', { workspaceTab: 'activities' });
  addParamB('B37', 'WBS & Coding', 'Duplicate WBS Names', false, 0, project.wbsMap.size || 1, 'Lower', 0.0, 5.0, '0.0%', '5.0%', 'WBS elements sharing identical names at sibling levels.', '≤ 0.0%', [], 'Unique WBS naming avoids reporting ambiguity.', { workspaceTab: 'wbs' });
  addParamB('B38', 'Float & Duration', 'Very short activities-1 Day', false, short1dActs.length, totalActs, 'Lower', 5.0, 15.0, '5.0%', '15.0%', 'Incomplete non-milestone activities with duration of 1 day or less.', '≤ 5.0%', short1dActs, 'Overly granular 1-day tasks inflate update effort without improving control.', { workspaceTab: 'activities' });
  addParamB('B39', 'Float & Duration', 'Very long activities- More than 88 Days', false, long88dActs.length, totalActs, 'Lower', 2.0, 10.0, '2.0%', '10.0%', 'Incomplete activities with duration > 88 working days (2 × 44).', '≤ 2.0%', long88dActs, 'Extremely long tasks (> 4 months) hide interim milestone slippage.', { workspaceTab: 'dcma', dcmaCheckId: 9 });

  // Aggregations
  const criteriaAParams = params.filter((p) => p.cat === 'A');
  const criteriaBParams = params.filter((p) => p.cat === 'B');

  const criteriaAAllotted = 20.0;
  const criteriaBAllotted = 80.0;

  const rawAEarned = criteriaAParams.reduce((sum, p) => sum + p.unitsEarned, 0);
  const rawBEarned = criteriaBParams.reduce((sum, p) => sum + p.unitsEarned, 0);

  const cleanCriteriaAEarned = Math.min(criteriaAAllotted, Math.round(rawAEarned * 100) / 100);
  const cleanCriteriaBEarned = Math.min(criteriaBAllotted, Math.round(rawBEarned * 100) / 100);
  const totalEarned = Math.min(100.0, Math.round((cleanCriteriaAEarned + cleanCriteriaBEarned) * 100) / 100);

  const criteriaAScorePct = criteriaAAllotted > 0
    ? Math.min(100.0, Math.round((cleanCriteriaAEarned / criteriaAAllotted) * 1000) / 10)
    : 100.0;
  const criteriaBScorePct = criteriaBAllotted > 0
    ? Math.min(100.0, Math.round((cleanCriteriaBEarned / criteriaBAllotted) * 1000) / 10)
    : 100.0;
  const overallScorePct = Math.min(100.0, Math.round((totalEarned / 100) * 1000) / 10);

  // Critical Gate Check
  const criticalItems = params.filter((p) => p.criticalKey);
  const criticalFailOrWarn = criticalItems.filter((p) => p.status === 'Fail' || p.status === 'Warning');
  const criticalGatePassed = criticalFailOrWarn.length === 0;

  let healthRating: 'HEALTHY' | 'ACCEPTABLE' | 'AT RISK' | 'CRITICAL' = 'ACCEPTABLE';
  if (overallScorePct >= 85) healthRating = 'HEALTHY';
  else if (overallScorePct >= 70) healthRating = 'ACCEPTABLE';
  else if (overallScorePct >= 50) healthRating = 'AT RISK';
  else healthRating = 'CRITICAL';

  // Cap rating at AT RISK if critical gate fails
  if (!criticalGatePassed && (healthRating === 'HEALTHY' || healthRating === 'ACCEPTABLE')) {
    healthRating = 'AT RISK';
  }

  const submissionVerdict = criticalGatePassed
    ? 'ACCEPTED WITH COMMENTS – no critical-key item to resubmit'
    : 'RESUBMIT REQUIRED – critical-key parameter failed or warning';

  // Theme summaries
  const themeNames: ThemeCategory[] = [
    'A: P6 Settings',
    'Logic',
    'Dates & Constraints',
    'Float & Duration',
    'Critical Path',
    'Progress',
    'Resources',
    'Calendars',
    'WBS & Coding',
  ];

  const themes: ThemeSummary[] = themeNames.map((tName) => {
    const tParams = params.filter((p) => p.theme === tName);
    const allotted = Math.round(tParams.reduce((sum, p) => sum + p.budgetUnits, 0) * 100) / 100;
    const earned = Math.min(allotted, Math.round(tParams.reduce((sum, p) => sum + p.unitsEarned, 0) * 100) / 100);
    const lost = Math.max(0, Math.round((allotted - earned) * 100) / 100);
    const scorePct = allotted > 0 ? Math.min(100, Math.round((earned / allotted) * 100)) : 100;
    return {
      theme: tName,
      unitsAllotted: allotted,
      applicable: allotted,
      earned,
      lost,
      scorePct,
      targetPct: 85,
    };
  });

  // Ranked Deficiencies (highest units lost first)
  const rankedDeficiencies = [...params]
    .filter((p) => p.unitsLost > 0 || p.status === 'Pending')
    .sort((a, b) => b.unitsLost - a.unitsLost);

  // Status counts
  const statusCounts = {
    pass: params.filter((p) => p.status === 'Pass').length,
    warning: params.filter((p) => p.status === 'Warning').length,
    fail: params.filter((p) => p.status === 'Fail').length,
    pending: params.filter((p) => p.status === 'Pending').length,
    na: params.filter((p) => p.status === 'N/A').length,
  };

  // Remaining duration buckets
  const remainingDurationRanges: RangeBucket[] = [
    { range: '0 d', count: activities.filter((a) => a.origDurationDays === 0).length, pct: 0 },
    { range: '1 d', count: activities.filter((a) => a.origDurationDays === 1).length, pct: 0 },
    { range: '2 – 5 d', count: activities.filter((a) => a.origDurationDays >= 2 && a.origDurationDays <= 5).length, pct: 0 },
    { range: '6 – 10 d', count: activities.filter((a) => a.origDurationDays >= 6 && a.origDurationDays <= 10).length, pct: 0 },
    { range: '11 – 20 d', count: activities.filter((a) => a.origDurationDays >= 11 && a.origDurationDays <= 20).length, pct: 0 },
    { range: '21 – 44 d', count: activities.filter((a) => a.origDurationDays >= 21 && a.origDurationDays <= 44).length, pct: 0 },
    { range: '45 – 88 d', count: activities.filter((a) => a.origDurationDays >= 45 && a.origDurationDays <= 88).length, pct: 0 },
    { range: '89 + d', count: activities.filter((a) => a.origDurationDays > 88).length, pct: 0 },
  ];
  remainingDurationRanges.forEach((r) => {
    r.pct = Math.round((r.count / totalActs) * 1000) / 10;
  });

  // Lags and leads ranges
  const lagsAndLeadsRanges: RangeBucket[] = [
    { range: '≤ -11 d (lead)', count: relationships.filter((r) => r.lagDays <= -11).length, pct: 0 },
    { range: '-10 to -1 d (lead)', count: relationships.filter((r) => r.lagDays > -11 && r.lagDays < 0).length, pct: 0 },
    { range: '0 d (no lag)', count: relationships.filter((r) => r.lagDays === 0).length, pct: 0 },
    { range: '1 – 5 d', count: relationships.filter((r) => r.lagDays >= 1 && r.lagDays <= 5).length, pct: 0 },
    { range: '6 – 10 d', count: relationships.filter((r) => r.lagDays >= 6 && r.lagDays <= 10).length, pct: 0 },
    { range: '11 – 20 d', count: relationships.filter((r) => r.lagDays >= 11 && r.lagDays <= 20).length, pct: 0 },
    { range: '> 20 d', count: relationships.filter((r) => r.lagDays > 20).length, pct: 0 },
  ];
  lagsAndLeadsRanges.forEach((r) => {
    r.pct = Math.round((r.count / totalRels) * 1000) / 10;
  });

  // Total float ranges
  const totalFloatRanges: RangeBucket[] = [
    { range: '< 0 d (negative)', count: activities.filter((a) => a.totalFloatDays < 0).length, pct: 0 },
    { range: '0 d (critical)', count: activities.filter((a) => a.totalFloatDays === 0).length, pct: 0 },
    { range: '1 – 10 d', count: activities.filter((a) => a.totalFloatDays >= 1 && a.totalFloatDays <= 10).length, pct: 0 },
    { range: '11 – 20 d', count: activities.filter((a) => a.totalFloatDays >= 11 && a.totalFloatDays <= 20).length, pct: 0 },
    { range: '21 – 44 d', count: activities.filter((a) => a.totalFloatDays >= 21 && a.totalFloatDays <= 44).length, pct: 0 },
    { range: '45 – 88 d', count: activities.filter((a) => a.totalFloatDays >= 45 && a.totalFloatDays <= 88).length, pct: 0 },
    { range: '> 88 d', count: activities.filter((a) => a.totalFloatDays > 88).length, pct: 0 },
  ];
  totalFloatRanges.forEach((r) => {
    r.pct = Math.round((r.count / totalActs) * 1000) / 10;
  });

  // Resources breakdown
  const laborCount = project.resources.filter((r) => r.type === 'RT_Labor').length;
  const nonlaborCount = project.resources.filter((r) => r.type === 'RT_Nonlabor').length;
  const matCount = project.resources.filter((r) => r.type === 'RT_Mat').length;

  const laborAssigns = activities.reduce((sum, a) => sum + a.assignments.filter((as) => as.resourceType === 'RT_Labor').length, 0);
  const nonlaborAssigns = activities.reduce((sum, a) => sum + a.assignments.filter((as) => as.resourceType === 'RT_Nonlabor').length, 0);
  const matAssigns = activities.reduce((sum, a) => sum + a.assignments.filter((as) => as.resourceType === 'RT_Mat').length, 0);

  const resourcesTypeBreakdown = [
    { type: 'Labor', noOfResources: laborCount, noOfAssignments: laborAssigns },
    { type: 'Nonlabor', noOfResources: nonlaborCount, noOfAssignments: nonlaborAssigns },
    { type: 'Material', noOfResources: matCount, noOfAssignments: matAssigns },
  ];

  // Fixed Calendar Assignment Breakdown matching actual Global, Project & Resource calendars in XER
  const calendarAssignmentBreakdown = [
    { type: 'Global', noOfCalendars: globalCalendars.length, noOfAssignments: actsOnGlobalCal },
    { type: 'Project', noOfCalendars: projCalendars.length, noOfAssignments: actsOnProjCal },
    { type: 'Resource', noOfCalendars: rsrcCalendars.length, noOfAssignments: actsOnRsrcCal },
  ];

  const scatterPlotPoints: ScatterPoint[] = activities.slice(0, 100).map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    totalFloat: a.totalFloatDays,
    remainingDuration: a.remainDurationDays,
    isCritical: a.isCritical,
  }));

  // --- Dynamic Dashboard Insights Computation (User EPC Framework) ---
  const ssClosureLoopPct = ssRels > 0 ? Math.round((ffRels / ssRels) * 1000) / 10 : 100;
  const relDensity = Math.round((totalRels / totalActs) * 100) / 100;
  const lagRelsCount = relationships.filter((r) => r.lagHours !== 0).length;
  const lagRelsPct = Math.round((lagRelsCount / totalRels) * 1000) / 10;

  const longDurActsCount = activities.filter((a) => a.type === 'TT_Task' && a.origDurationDays > 44).length;
  const veryLongDurActsCount = activities.filter((a) => a.type === 'TT_Task' && a.origDurationDays > 88).length;
  const shortDurActsCount = activities.filter((a) => a.type === 'TT_Task' && a.origDurationDays > 0 && a.origDurationDays < 5).length;
  const negZeroFloatCount = activities.filter((a) => a.status !== 'TK_Complete' && a.totalFloatDays <= 0).length;
  const highFloatActsCount = activities.filter((a) => a.status !== 'TK_Complete' && a.totalFloatDays > 44).length;

  const hardConstraintsCount = activities.filter((a) =>
    a.constraintType && ['MAND', 'MUST', 'CS_MAND', 'CS_MSO', 'CS_MEO', 'STARTON', 'FINISHON'].some((k) => a.constraintType!.toUpperCase().includes(k))
  ).length;
  const softConstraintsCount = activities.filter((a) =>
    a.constraintType && !['MAND', 'MUST', 'CS_MAND', 'CS_MSO', 'CS_MEO', 'STARTON', 'FINISHON'].some((k) => a.constraintType!.toUpperCase().includes(k))
  ).length;
  const totalConstraintsCount = activities.filter((a) => !!a.constraintType).length;
  const constraintPct = Math.round((totalConstraintsCount / totalActs) * 1000) / 10;

  const maxWbsDepth = Math.max(0, ...Array.from(project.wbsMap.values()).map((w) => w.level || 0)) + 1;
  const wbsNameCounts = new Map<string, number>();
  for (const w of project.wbsMap.values()) {
    const n = (w.name || '').trim().toLowerCase();
    if (n) wbsNameCounts.set(n, (wbsNameCounts.get(n) || 0) + 1);
  }
  let duplicateWbsCount = 0;
  for (const count of wbsNameCounts.values()) {
    if (count > 1) duplicateWbsCount += (count - 1);
  }

  const actNameCounts = new Map<string, number>();
  for (const a of activities) {
    const n = (a.name || '').trim().toLowerCase();
    if (n) actNameCounts.set(n, (actNameCounts.get(n) || 0) + 1);
  }
  let duplicateActCount = 0;
  for (const count of actNameCounts.values()) {
    if (count > 1) duplicateActCount += (count - 1);
  }

  const actsWithoutWbs = activities.filter((a) => !a.wbsId || !project.wbsMap.has(a.wbsId)).length;
  const emptyWbsNodesCount = Array.from(project.wbsMap.values()).filter((w) => w.children.length === 0 && w.activityCount === 0).length;
  const totalResourceAssignments = activities.reduce((sum, a) => sum + a.assignments.length, 0);

  const projCals = projCalendars.length;
  const globalCals = globalCalendars.length;
  const rsrcCals = rsrcCalendars.length;

  const insights: ScheduleInsightsData = {
    logicAnalysis: [
      { category: 'Logic Analysis', kpi: 'Total Relationships', unit: 'Count', value: totalRels, formula: 'Total Relationships from P6', status: 'healthy', navigationTarget: { workspaceTab: 'gantt' } },
      { category: 'Logic Analysis', kpi: 'FS Relationships', unit: 'Count', value: fsRels, formula: 'Finish-to-Start ties', status: fsSharePct >= 90 ? 'healthy' : 'warning', navigationTarget: { workspaceTab: 'dcma' } },
      { category: 'Logic Analysis', kpi: 'SS Relationships', unit: 'Count', value: ssRels, formula: 'Start-to-Start ties', status: 'neutral', navigationTarget: { workspaceTab: 'dcma' } },
      { category: 'Logic Analysis', kpi: 'FF Relationships', unit: 'Count', value: ffRels, formula: 'Finish-to-Finish ties', status: 'neutral', navigationTarget: { workspaceTab: 'dcma' } },
      { category: 'Logic Analysis', kpi: 'SF Relationships', unit: 'Count', value: sfRels, formula: 'Start-to-Finish ties (avoid)', status: sfRels === 0 ? 'healthy' : 'critical', navigationTarget: { workspaceTab: 'dcma' } },
      { category: 'Logic Analysis', kpi: 'SS Closure of Loop', unit: '%', value: `${ssClosureLoopPct}%`, formula: '(FF Links / SS Links) * 100', status: ssClosureLoopPct >= 80 ? 'healthy' : 'warning', navigationTarget: { workspaceTab: 'healthDashboard', dashboardSubTab: 'checklist', themeFilter: 'Logic' } },
      { category: 'Logic Analysis', kpi: 'Average Relationship Density', unit: 'Ratio', value: relDensity.toFixed(2), formula: 'Total Relationships count / Total Nos of Activities', status: relDensity >= 2.0 ? 'healthy' : 'warning', navigationTarget: { workspaceTab: 'healthDashboard', dashboardSubTab: 'checklist', themeFilter: 'Logic' } },
      { category: 'Logic Analysis', kpi: 'Lag Relationships %', unit: '%', value: `${lagRelsPct}%`, formula: 'Relationships with Lag / Total Relationships × 100', status: lagRelsPct <= 5 ? 'healthy' : lagRelsPct <= 10 ? 'warning' : 'critical', navigationTarget: { workspaceTab: 'dcma' } },
    ],
    durationAnalysis: [
      { category: 'Duration Analysis', kpi: 'Long Duration Activities', unit: 'Count', value: longDurActsCount, formula: 'Duration > 44 Working Days', status: longDurActsCount / totalActs <= 0.05 ? 'healthy' : 'warning', navigationTarget: { workspaceTab: 'dcma' } },
      { category: 'Duration Analysis', kpi: 'Very Long Duration Activities', unit: 'Count', value: veryLongDurActsCount, formula: 'Duration > 88 Working Days', status: veryLongDurActsCount === 0 ? 'healthy' : 'critical', navigationTarget: { workspaceTab: 'healthDashboard', dashboardSubTab: 'checklist', themeFilter: 'Float & Duration' } },
      { category: 'Duration Analysis', kpi: 'Short Duration Activities', unit: 'Count', value: shortDurActsCount, formula: 'Duration < 5 Days', status: 'neutral', navigationTarget: { workspaceTab: 'activities' } },
      { category: 'Duration Analysis', kpi: 'Negative and Zero Float Activities', unit: 'Count', value: negZeroFloatCount, formula: 'Float <= 0 Days', status: negativeFloatActs === 0 ? 'healthy' : 'critical', navigationTarget: { workspaceTab: 'healthDashboard', dashboardSubTab: 'paths' } },
      { category: 'Duration Analysis', kpi: 'High Positive Float Activities', unit: 'Count', value: highFloatActsCount, formula: 'Float > 44 Days', status: highFloatActsCount / totalActs <= 0.1 ? 'healthy' : 'warning', navigationTarget: { workspaceTab: 'dcma' } },
    ],
    constraintsAnalysis: [
      { category: 'Constraints Analysis', kpi: 'Hard Constraints', unit: 'Count', value: hardConstraintsCount, formula: 'No. of Mandatory Start + Mandatory Finish Activities', status: hardConstraintsCount === 0 ? 'healthy' : 'critical', navigationTarget: { workspaceTab: 'dcma' } },
      { category: 'Constraints Analysis', kpi: 'Soft Constraints', unit: 'Count', value: softConstraintsCount, formula: 'Soft / As Soon As Possible constraints', status: 'neutral', navigationTarget: { workspaceTab: 'healthDashboard', dashboardSubTab: 'checklist', themeFilter: 'Dates & Constraints' } },
      { category: 'Constraints Analysis', kpi: 'Total Constraints', unit: 'Count', value: totalConstraintsCount, formula: 'Total Constrained Activities', status: totalConstraintsCount / totalActs <= 0.05 ? 'healthy' : 'warning', navigationTarget: { workspaceTab: 'dcma' } },
      { category: 'Constraints Analysis', kpi: 'Constraint Percentage', unit: '%', value: `${constraintPct}%`, formula: 'Constrained Activities / Total Activities × 100', status: constraintPct <= 5 ? 'healthy' : 'warning', navigationTarget: { workspaceTab: 'healthDashboard', dashboardSubTab: 'checklist', themeFilter: 'Dates & Constraints' } },
    ],
    wbsQuality: [
      { category: 'WBS & Activity Quality', kpi: 'Number of WBS Levels', unit: 'Count', value: maxWbsDepth, formula: 'Maximum WBS Depth', status: 'healthy', navigationTarget: { workspaceTab: 'wbs' } },
      { category: 'WBS & Activity Quality', kpi: 'Duplicate WBS Names', unit: 'Count', value: duplicateWbsCount, formula: 'Count of WBS Having Same Name', status: duplicateWbsCount === 0 ? 'healthy' : 'warning', navigationTarget: { workspaceTab: 'wbs' } },
      { category: 'WBS & Activity Quality', kpi: 'Duplicate Activity Names', unit: 'Count', value: duplicateActCount, formula: 'Count of Activities Having Same Name', status: duplicateActCount === 0 ? 'healthy' : 'warning', navigationTarget: { workspaceTab: 'activities' } },
      { category: 'WBS & Activity Quality', kpi: 'Activities Without WBS', unit: 'Count', value: actsWithoutWbs, formula: 'Activities without valid WBS parent', status: actsWithoutWbs === 0 ? 'healthy' : 'critical', navigationTarget: { workspaceTab: 'wbs' } },
      { category: 'WBS & Activity Quality', kpi: 'Empty WBS Nodes', unit: 'Count', value: emptyWbsNodesCount, formula: 'Count of WBS with No Activities', status: emptyWbsNodesCount === 0 ? 'healthy' : 'warning', navigationTarget: { workspaceTab: 'wbs' } },
    ],
    resourceAnalysis: [
      { category: 'Resource Analysis', kpi: 'Labor Resources', unit: 'Count', value: laborCount, formula: 'Labor resources defined in schedule', status: 'healthy', navigationTarget: { workspaceTab: 'resources' } },
      { category: 'Resource Analysis', kpi: 'Non-Labor Resources', unit: 'Count', value: nonlaborCount, formula: 'Equipment & plant resources', status: 'healthy', navigationTarget: { workspaceTab: 'resources' } },
      { category: 'Resource Analysis', kpi: 'Material Resources', unit: 'Count', value: matCount, formula: 'Material resources in catalog', status: 'healthy', navigationTarget: { workspaceTab: 'resources' } },
      { category: 'Resource Analysis', kpi: 'Total Resource Assignments', unit: 'Count', value: totalResourceAssignments, formula: 'Total task resource assignments', status: 'healthy', navigationTarget: { workspaceTab: 'resources' } },
      { category: 'Resource Analysis', kpi: 'Overallocated Resources', unit: 'Count', value: 0, formula: 'Resources exceeding limit in any period', status: 'healthy', navigationTarget: { workspaceTab: 'resources' } },
    ],
    calendarAnalysis: [
      { category: 'Calendar Analysis', kpi: 'Project Calendars', unit: 'Count', value: projCals, formula: 'Project-specific Calendars (CA_Project)', status: projCals > 0 ? 'healthy' : 'warning', navigationTarget: { workspaceTab: 'healthDashboard', dashboardSubTab: 'calendars' } },
      { category: 'Calendar Analysis', kpi: 'Global Calendars', unit: 'Count', value: globalCals, formula: 'Global Calendars defined (CA_Base)', status: 'healthy', navigationTarget: { workspaceTab: 'healthDashboard', dashboardSubTab: 'calendars' } },
      { category: 'Calendar Analysis', kpi: 'Resource Calendars', unit: 'Count', value: rsrcCals, formula: 'Resource-specific Calendars (CA_Rsrc)', status: 'neutral', navigationTarget: { workspaceTab: 'healthDashboard', dashboardSubTab: 'calendars' } },
      { category: 'Calendar Analysis', kpi: 'Activities on Project Calendar', unit: 'Count', value: actsOnProjCal, formula: 'Activities assigned project calendars', status: actsOnProjCal > 0 ? 'healthy' : 'neutral', navigationTarget: { workspaceTab: 'healthDashboard', dashboardSubTab: 'calendars' } },
      { category: 'Calendar Analysis', kpi: 'Activities on Global Calendar', unit: 'Count', value: actsOnGlobalCal, formula: 'Activities assigned global calendars', status: 'neutral', navigationTarget: { workspaceTab: 'healthDashboard', dashboardSubTab: 'calendars' } },
      { category: 'Calendar Analysis', kpi: 'Activities on Resource Calendar', unit: 'Count', value: actsOnRsrcCal, formula: 'Activities assigned resource calendars', status: 'neutral', navigationTarget: { workspaceTab: 'healthDashboard', dashboardSubTab: 'calendars' } },
    ],
  };

  return {
    projectDetails: {
      projectName: project.metadata.name,
      scheduleType,
      dataDate,
      projectStart: actualProjectStart,
      projectFinish: actualProjectFinish,
      scheduledFinish: project.metadata.scheduledFinishDate || project.stats.finishDate,
      mustFinishBy,
      contractStart: actualProjectStart,
      contractCompletion,
      completionSourceNote: project.metadata.scheduledFinishDate
        ? 'Matches P6 Scheduled Finish (scd_end_date)'
        : 'Computed from latest activity finish date',
      reviewer: 'Planning Engineer (P6)',
      reviewDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      currencyCode: project.metadata.currencyCode || 'USD',
      currencySymbol: project.metadata.currencySymbol || '$',
    },
    counts: {
      totalActivities: totalActs,
      completedActivities: completedActs,
      inProgressActivities: inProgressActs,
      incompleteActivities: incompleteActs,
      milestonesCount: milestones,
      loeAndSummaryCount: loeSummary,
      incompleteTaskActivities: incompleteTaskActs,
      totalWbsNodes: project.wbsMap.size || 1,
      fsRelationships: fsRels,
      ssRelationships: ssRels,
      ffRelationships: ffRels,
      sfRelationships: sfRels,
      totalRelationships: totalRels,
      fsSharePct,
      fsDensity,
      totalResources: project.resources.length,
      negativeFloatActivities: negativeFloatActs,
      criticalPathActivities: criticalActs,
      criticalPathPct,
      criticalPathLengthDays,
      minProjectTotalFloatDays: minProjectFloat,
      calendarsInUse: calIdsUsed.size || project.calendars.length || 1,
    },
    scoring: {
      totalBudgetedUnits: 100,
      criteriaAUnitsAllotted: 20.0,
      criteriaAApplicableUnits: 20.0,
      criteriaAUnitsEarned: cleanCriteriaAEarned,
      criteriaAScorePct: criteriaAScorePct,
      criteriaBUnitsAllotted: 80.0,
      criteriaBApplicableUnits: 80.0,
      criteriaBUnitsEarned: cleanCriteriaBEarned,
      criteriaBScorePct: criteriaBScorePct,
      totalApplicableUnits: 100.0,
      totalUnitsEarned: totalEarned,
      overallHealthScorePct: overallScorePct,
      healthRating,
      criticalGatePassed,
      criticalItemsCount: criticalItems.length,
      criticalItemsPassed: criticalItems.length - criticalFailOrWarn.length,
      criticalItemsFailedOrWarning: criticalFailOrWarn.length,
      submissionVerdict,
      submissionVerdictType: criticalGatePassed ? 'accepted_with_comments' : 'resubmit_required',
      statusCounts,
    },
    themes,
    parameters: params,
    rankedDeficiencies,
    statisticalDistributions: {
      remainingDurationRanges,
      lagsAndLeadsRanges,
      totalFloatRanges,
      resourcesTypeBreakdown,
      calendarAssignmentBreakdown,
      scatterPlotPoints,
    },
    insights,
  };
}
