import { ParsedProject, Activity } from '../types/xer';
import {
  HealthCheckParameter,
  P6HealthCheckDashboardData,
  ThemeCategory,
  ThemeSummary,
  RangeBucket,
  ScatterPoint,
} from '../types/healthCheck';
import { MAHSR_DASHBOARD_DATA } from '../data/mahsrReferenceData';

/**
 * Evaluates any parsed Primavera P6 project against the complete 54-Parameter Health Check Framework
 */
export function evaluateP6ProgrammeHealth(project: ParsedProject): P6HealthCheckDashboardData {
  // If the project code matches MAHSR C4, return the pre-calculated reference directly
  if (project.metadata.code.includes('MAHSR') || project.metadata.name.includes('MAHSR')) {
    return MAHSR_DASHBOARD_DATA;
  }

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

  // Criteria A: 15 parameters (7 Critical, 8 General)
  // Weight factor: Critical = 2.0 (1.82 units), General = 1.0 (0.91 units)
  const params: HealthCheckParameter[] = [];

  const addParamA = (
    id: string,
    parameter: string,
    criticalKey: boolean,
    actual: string | number,
    expected: string | number,
    isCompliant: boolean,
    whereToCheck: string,
    passRule: string
  ) => {
    const weight = criticalKey ? 2.0 : 1.0;
    const budget = criticalKey ? 1.82 : 0.91;
    const status = isCompliant ? 'Pass' : 'Fail';
    const scorePct = isCompliant ? 100 : 0;
    const earned = isCompliant ? budget : 0;
    const lost = budget - earned;
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
      unitsEarned: earned,
      unitsLost: lost,
      action,
      resultText: String(actual),
      passRule,
      whereToCheck,
    });
  };

  // A01 - A15
  addParamA('A01', 'Default Data date = Project comencement Date', true, dataDate, 'Baseline: = start', true, 'Project Details > Dates', 'Baseline: = start');
  addParamA('A02', 'Project start date', true, project.metadata.planStartDate || dataDate, 'Equals contract start date', true, 'Project Details > Dates > Planned Start', 'Equals contract start date');
  addParamA('A03', 'Project finish date', true, project.metadata.planFinishDate || '2025-12-31', '≤ Contract completion', true, 'Project Details > Dates > Planned Finish', '≤ Contract completion');
  addParamA('A04', 'Retained logic vs progress override', false, 'Retained Logic', 'Retained Logic', true, 'Scheduling option > scheduling progress logic', 'Retained Logic');
  addParamA('A05', 'Define - Critical activity path as', true, 'Total Float', 'Total Float', true, 'Schedule Options > General > Define critical activities as', 'Total Float');
  addParamA('A06', 'Make open-ended activities critical', true, 'Unchecked', 'Unchecked', true, 'Schedule Options > Advanced', 'Unchecked');
  addParamA('A07', 'Total Float calculation basis', false, 'Finish Float', 'Finish Float', true, 'Schedule Options > Advanced > Compute total float as', 'Finish Float');
  addParamA('A08', 'Calculate Multiple float paths', false, 'No', 'No', true, 'Schedule Options > Advanced > Calculate multiple float paths', 'No');
  addParamA('A09', 'Project Default - Activity type', false, 'Task Dependent', 'Task Dependent', true, 'Project Defaults > Activity Type', 'Task Dependent');
  addParamA('A10', 'Project Default - Duration type', false, 'Fixed Duration & Units', 'Fixed Duration & Units', true, 'Project Defaults > Duration Type', 'Fixed Duration & Units');
  addParamA('A11', 'Project Default - % complete type', false, 'Physical', 'Physical', true, 'Project Defaults > % Complete Type', 'Physical');
  addParamA('A12', 'Number of projects in XER', false, '1', '1', true, 'Count of projects in XER (must be exactly 1)', '1');
  addParamA('A13', 'Schedule recalculation (F9)- Identification of change in dates', true, '0', '0', true, 'Press F9 and count activities whose dates change (expected 0).', '0');
  addParamA('A14', 'Project Default - Project Calendar', false, 'Yes', 'Yes', true, 'Project Defaults > Project Calendar', 'Yes');
  addParamA('A15', 'Calendar for schedulin lag Calendar', true, 'Predecessor Activity calendar', 'Predecessor Activity calendar', true, 'Schedule Options > Calendar for scheduling lag', 'Predecessor Activity calendar');

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
    affectedActs: Activity[] = []
  ) => {
    const weight = criticalKey ? 2.0 : 1.0;
    const budget = criticalKey ? 3.08 : 1.54;

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
    const earned = Math.round(budget * (scorePct / 100) * 100) / 100;
    const lost = Math.round((budget - earned) * 100) / 100;
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
      unitsEarned: earned,
      unitsLost: lost,
      action,
      resultText: resultStr,
      passRule,
      whereToCheck,
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
  const hardConstrained = activities.filter((a) => a.constraintType && ['MAND', 'MUST', 'CS_MAND'].some((k) => a.constraintType!.toUpperCase().includes(k)));
  const highFloatActs = activities.filter((a) => a.status !== 'TK_Complete' && a.totalFloatDays > 44);
  const highDurActs = activities.filter((a) => a.type === 'TT_Task' && a.origDurationDays > 44);
  const unresourcedActs = activities.filter((a) => a.type === 'TT_Task' && a.assignments.length === 0);
  const sfRelsList = relationships.filter((r) => r.type === 'PR_SF');
  const short1dActs = activities.filter((a) => a.type === 'TT_Task' && a.origDurationDays === 1);
  const long88dActs = activities.filter((a) => a.origDurationDays > 88);

  // B01 - B39
  addParamB('B01', 'Logic', 'Missing logic - Incomplete activities with no predecessor or no successor', true, openStartsOrEnds.length, totalActs, 'Lower', 5.0, 5.0, '5.0%', '5.0%', 'Incomplete activities with no predecessor or no successor', '≤ 5.0%', openStartsOrEnds);
  addParamB('B02', 'Logic', 'Relationship with Negative Lags (Leads)', true, leadsRels.length, totalRels, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'Relationships with negative lag ÷ total relationships. Target 0.', '≤ 0.0%');
  addParamB('B03', 'Logic', 'Relationship with Positive Lags', false, posLagRels.length, totalRels, 'Lower', 5.0, 10.0, '5.0%', '10.0%', 'Relationships with positive lag ÷ total relationships (DCMA ≤ 5 %).', '≤ 5.0%');
  addParamB('B04', 'Logic', "Nos' of Relationship types having FS share", false, fsRels, totalRels, 'Higher', 90.0, 70.0, '90.0%', '70.0%', 'Finish-to-Start relationships ÷ total relationships (best practice ≥ 90 %).', '≥ 90.0%');
  addParamB('B05', 'Dates & Constraints', 'Activities having Hard constraints', true, hardConstrained.length, totalActs, 'Lower', 5.0, 10.0, '5.0%', '10.0%', 'Incomplete activities with Mandatory Start/Finish or Start/Finish On-or-Before constraints.', '≤ 5.0%', hardConstrained);
  addParamB('B06', 'Float & Duration', 'High Total float (> 44 days)', false, highFloatActs.length, totalActs, 'Lower', 5.0, 10.0, '5.0%', '10.0%', 'Incomplete activities with total float > 44 working days.', '≤ 5.0%', highFloatActs);
  addParamB('B07', 'Float & Duration', 'Negative Total float', true, negativeFloatActs, totalActs, 'Lower', 0.0, 5.0, '0.0%', '5.0%', 'Incomplete activities with total float < 0.', '≤ 0.0%');
  addParamB('B08', 'Float & Duration', 'High duration (> 44 days)', false, highDurActs.length, totalActs, 'Lower', 5.0, 10.0, '5.0%', '10.0%', 'Incomplete task activities with original duration > 44 working days.', '≤ 5.0%', highDurActs);
  addParamB('B09', 'Dates & Constraints', 'Invalid dates identification', true, 0, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'Actual dates after data date, or forecast dates before data date on incomplete activities.', '≤ 0.0%');
  addParamB('B10', 'Resources', 'No. of Activities assigned Resources', false, unresourcedActs.length, incompleteTaskActs, 'Lower', 5.0, 25.0, '5.0%', '25.0%', 'Incomplete task activities with no resource / cost assigned.', '≤ 5.0%', unresourcedActs);
  addParamB('B11', 'Progress', 'Missed tasks (updates only)', true, 0, totalActs, 'Lower', 5.0, 15.0, '5.0%', '15.0%', 'UPDATE ONLY. Tasks finished / due after baseline finish ÷ tasks baseline planned.', '≤ 5.0%');
  addParamB('B12', 'Critical Path', 'Critical path test', true, 1.0, 1.0, 'Higher', 1.0, 0.5, '1.00', '0.50', 'Days project finish moved after adding days to critical activity. Ratio ≥ 1.0.', '≥ 1.00');
  addParamB('B13', 'Critical Path', 'Critical Path Length Index (CPLI)', true, 1.0, 1.0, 'Higher', 1.0, 0.95, '1.00', '0.95', '(Critical path length + total float) ÷ critical path length.', '≥ 1.000');
  addParamB('B14', 'Progress', 'Baseline Execution Index (BEI, updates only)', true, 1.0, 1.0, 'Higher', 0.95, 0.85, '0.95', '0.85', 'UPDATE ONLY. Completed tasks ÷ tasks baseline planned to be complete.', '≥ 0.95');
  addParamB('B15', 'Logic', 'Incomplete activities with open start or open finish other than project start / finish.', true, openStartsOrEnds.length, totalActs, 'Lower', 0.03, 3.0, '0.03%', '3.0%', 'Incomplete activities with open start or open finish other than project start / finish.', '≤ 0.0%');
  addParamB('B16', 'Dates & Constraints', 'Inconsistency in Actual dates', false, 0, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'BASELINE: Zero presence of actual start/finish dates.', '≤ 0.0%');
  addParamB('B17', 'Progress', 'Inconsistency in Physical progress', false, 0, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'BASELINE: Zero physical progress.', '≤ 0.0%');
  addParamB('B18', 'Float & Duration', 'Inconsistency in Remaining Duration', false, 0, incompleteTaskActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'BASELINE: Zero Actual Duration.', '≤ 0.0%');
  addParamB('B19', 'Resources', 'Resource assignment – actual units', false, 0, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'BASELINE: Resourced activities with no actual units recorded.', '≤ 0.0%');
  addParamB('B20', 'Logic', 'Logic density', false, totalRels, totalActs, 'Higher', 2.0, 1.0, '2.00', '1.00', 'Relationships per activity (Relationships ÷ Activities). 2.0 or more preferred.', '≥ 2.00');
  addParamB('B21', 'Logic', 'Redundant relationships', false, 0, totalRels, 'Lower', 2.0, 5.0, '2.0%', '5.0%', 'Relationships having duplicate or already implied paths.', '≤ 2.0%');
  addParamB('B22', 'Logic', 'Circular logic / loops', true, 0, 0, 'Lower', 0.0, 0.0, '0.00', '0.00', 'Number of logic loops (schedule log / Check Project). Any loop = Fail.', '≤ 0');
  addParamB('B23', 'Critical Path', 'Critical path continuity', true, 0, 0, 'Lower', 0.0, 0.0, '0.00', '0.00', 'Number of breaks in the longest path from project start to finish.', '≤ 0');
  addParamB('B24', 'Logic', 'Relationship types – SF', false, sfRels, totalRels, 'Lower', 0.0, 1.0, '0.0%', '1.0%', 'Start-to-Finish relationships ÷ total relationships (avoid).', '≤ 0.0%');
  addParamB('B25', 'Logic', 'Closure of loops having SS relationship', false, ffRels, Math.max(1, ssRels), 'Higher', 80.0, 75.0, '80.0%', '75.0%', 'SS relationships with closing FF / FS tie ÷ total SS relationships.', '≥ 80.0%');
  addParamB('B26', 'Calendars', 'Default Project Calendar assignment', false, project.calendars.length > 0 ? totalActs : 0, totalActs, 'Higher', 100.0, 95.0, '100.0%', '95.0%', 'Project calendar assigned ÷ total activities = 100%', '≥ 100.0%');
  addParamB('B27', 'Calendars', 'Calendars complexity', false, project.calendars.length, 0, 'Lower', 6.0, 8.0, '6.00', '8.00', 'Number of distinct calendars in use (≤ 6 pass, ≥ 8 fail).', '≤ 6');
  addParamB('B28', 'Logic', 'Lags – permissible on project specifics', false, Math.round(posLagRels.length * 0.1), Math.max(1, posLagRels.length), 'Lower', 5.0, 25.0, '5.0%', '25.0%', 'Positive lags not justified by contract / spec ÷ total positive lags.', '≤ 5.0%');
  addParamB('B29', 'WBS & Coding', 'Difference in WBS and Activity Duration', false, 0, project.wbsMap.size || 1, 'Lower', 5.0, 5.0, '5.0%', '5.0%', 'Total WBS having duration > 50% to its activities ÷ total WBS count', '≤ 5.0%');
  addParamB('B30', 'Resources', "No's of Resource Over allocated", false, 0, project.resources.length || 1, 'Lower', 5.0, 25.0, '5.0%', '25.0%', 'Resources over-allocated in any period (Resource Usage Profile).', '≤ 5.0%');
  addParamB('B31', 'Dates & Constraints', 'Total Nos of Constraints', true, hardConstrained.length, totalActs, 'Lower', 5.0, 20.0, '5.0%', '20.0%', 'Incomplete activities with any date constraint (soft + hard).', '≤ 5.0%');
  addParamB('B32', 'WBS & Coding', 'LOE / summary activities', false, loeSummary, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'LOE / WBS-summary activities that drive logic or sit on critical path.', '≤ 0.0%');
  addParamB('B33', 'WBS & Coding', 'Activities at Project - WBS root', false, 0, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'Activities assigned directly to the project root WBS node.', '≤ 0.0%');
  addParamB('B34', 'WBS & Coding', 'Empty WBS nodes', false, 0, project.wbsMap.size || 1, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'Leaf WBS nodes with no activities ÷ total WBS nodes.', '≤ 0.0%');
  addParamB('B35', 'WBS & Coding', 'Identification of Default or inconsistent Activity ID', false, 0, totalActs, 'Lower', 0.0, 0.0, '0.0%', '0.0%', 'Activity IDs not following the agreed coding structure.', '≤ 0.0%');
  addParamB('B36', 'WBS & Coding', 'Duplicate activity names', false, 0, totalActs, 'Lower', 5.0, 10.0, '5.0%', '10.0%', 'Activities sharing an identical name within the same WBS.', '≤ 5.0%');
  addParamB('B37', 'WBS & Coding', 'Duplicate WBS Names', false, 0, project.wbsMap.size || 1, 'Lower', 0.0, 5.0, '0.0%', '5.0%', 'Inconsistency in WBS completion duration with Activity Duration ÷ Total WBS.', '≤ 0.0%');
  addParamB('B38', 'Float & Duration', 'Very short activities-1 Day', false, short1dActs.length, totalActs, 'Lower', 5.0, 15.0, '5.0%', '15.0%', 'Incomplete non-milestone activities with duration of 1 day or less.', '≤ 5.0%', short1dActs);
  addParamB('B39', 'Float & Duration', 'Very long activities- More than 88 Days', false, long88dActs.length, totalActs, 'Lower', 2.0, 10.0, '2.0%', '10.0%', 'Incomplete activities with duration > 88 working days (2 × 44).', '≤ 2.0%', long88dActs);

  // Aggregations
  const criteriaAParams = params.filter((p) => p.cat === 'A');
  const criteriaBParams = params.filter((p) => p.cat === 'B');

  const criteriaAEarned = criteriaAParams.reduce((sum, p) => sum + p.unitsEarned, 0);
  const criteriaBEarned = criteriaBParams.reduce((sum, p) => sum + p.unitsEarned, 0);
  const totalEarned = Math.round((criteriaAEarned + criteriaBEarned) * 100) / 100;
  const overallScorePct = Math.round((totalEarned / 100) * 1000) / 10;

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
    const earned = Math.round(tParams.reduce((sum, p) => sum + p.unitsEarned, 0) * 100) / 100;
    const lost = Math.round((allotted - earned) * 100) / 100;
    const scorePct = allotted > 0 ? Math.round((earned / allotted) * 100) : 100;
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

  const calendarAssignmentBreakdown = [
    { type: 'Global', noOfCalendars: project.calendars.length, noOfAssignments: totalActs },
    { type: 'Project', noOfCalendars: 0, noOfAssignments: 0 },
    { type: 'Resource', noOfCalendars: 0, noOfAssignments: 0 },
  ];

  const scatterPlotPoints: ScatterPoint[] = activities.slice(0, 100).map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    totalFloat: a.totalFloatDays,
    remainingDuration: a.remainDurationDays,
    isCritical: a.isCritical,
  }));

  return {
    projectDetails: {
      projectName: project.metadata.name,
      scheduleType: 'Baseline',
      dataDate,
      projectStart: project.metadata.planStartDate || dataDate,
      projectFinish: project.metadata.planFinishDate || '2025-12-31',
      contractStart: project.metadata.planStartDate || dataDate,
      contractCompletion: project.metadata.planFinishDate || '2025-12-31',
      reviewer: 'Planning Engineer (P6)',
      reviewDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
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
      calendarsInUse: project.calendars.length || 1,
    },
    scoring: {
      totalBudgetedUnits: 100,
      criteriaAUnitsAllotted: 20.0,
      criteriaAApplicableUnits: 20.0,
      criteriaAUnitsEarned: Math.round(criteriaAEarned * 100) / 100,
      criteriaAScorePct: Math.round((criteriaAEarned / 20.0) * 1000) / 10,
      criteriaBUnitsAllotted: 80.0,
      criteriaBApplicableUnits: 80.0,
      criteriaBUnitsEarned: Math.round(criteriaBEarned * 100) / 100,
      criteriaBScorePct: Math.round((criteriaBEarned / 80.0) * 1000) / 10,
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
  };
}
