/**
 * Types for the L&T 54-Parameter P6 Programme Health Check & Evaluation Framework
 */

export type ThemeCategory =
  | 'A: P6 Settings'
  | 'Logic'
  | 'Dates & Constraints'
  | 'Float & Duration'
  | 'Critical Path'
  | 'Progress'
  | 'Resources'
  | 'Calendars'
  | 'WBS & Coding';

export type HealthCheckStatus = 'Pass' | 'Warning' | 'Fail' | 'Pending' | 'N/A';
export type BetterWhenDirection = 'Lower' | 'Higher' | '-';
export type ActionType = 'OK' | 'Review & improve' | 'RECHECK & RESUBMIT' | 'Enter data';
export type ScheduleHealthRating = 'HEALTHY' | 'ACCEPTABLE' | 'AT RISK' | 'CRITICAL';

export interface HealthCheckParameter {
  id: string; // e.g. "A01", "B01"
  cat: 'A' | 'B';
  theme: ThemeCategory;
  parameter: string;
  criticalKey: boolean; // Yes = 2.0 weight (mandatory pass gate), No = 1.0 weight
  weightFactor: number;
  budgetUnits: number; // e.g. 1.82 for Critical A, 0.91 for General A, 3.08 for Critical B, 1.54 for General B
  
  actualSettingOrCount: string | number;
  expectedSettingOrBase: string | number;
  resultStr: string;
  betterWhen: BetterWhenDirection;
  targetStr: string;
  limitStr: string;
  
  status: HealthCheckStatus;
  scorePct: number; // 100%, 50%, 0%
  unitsEarned: number;
  unitsLost: number;
  action: ActionType;
  
  resultText: string;
  passRule: string;
  whereToCheck: string;
  limitAtFail?: string;
  
  affectedActivities?: { id: string; code: string; name: string; reason: string }[];
}

export interface ThemeSummary {
  theme: ThemeCategory;
  unitsAllotted: number;
  applicable: number;
  earned: number;
  lost: number;
  scorePct: number;
  targetPct: number;
}

export interface RangeBucket {
  range: string;
  count: number;
  pct: number;
  note?: string;
  color?: string;
}

export interface ResourceSummaryItem {
  type: string;
  noOfResources: number;
  noOfAssignments: number;
}

export interface CalendarSummaryItem {
  type: string;
  noOfCalendars: number;
  noOfAssignments: number;
}

export interface ScatterPoint {
  id: string;
  code: string;
  name: string;
  totalFloat: number;
  remainingDuration: number;
  isCritical: boolean;
}

export interface P6HealthCheckDashboardData {
  projectDetails: {
    projectName: string;
    scheduleType: 'Baseline' | 'Update';
    dataDate: string;
    projectStart: string;
    projectFinish: string;
    mustFinishBy?: string;
    contractStart: string;
    contractCompletion: string;
    reviewer: string;
    reviewDate: string;
  };
  
  counts: {
    totalActivities: number;
    completedActivities: number;
    inProgressActivities: number;
    incompleteActivities: number;
    milestonesCount: number;
    loeAndSummaryCount: number;
    incompleteTaskActivities: number;
    totalWbsNodes: number;
    fsRelationships: number;
    ssRelationships: number;
    ffRelationships: number;
    sfRelationships: number;
    totalRelationships: number;
    fsSharePct: number;
    fsDensity: number;
    totalResources: number;
    negativeFloatActivities: number;
    criticalPathActivities: number;
    criticalPathPct: number;
    criticalPathLengthDays: number;
    minProjectTotalFloatDays: number;
    calendarsInUse: number;
  };

  scoring: {
    totalBudgetedUnits: number;
    criteriaAUnitsAllotted: number;
    criteriaAApplicableUnits: number;
    criteriaAUnitsEarned: number;
    criteriaAScorePct: number;
    
    criteriaBUnitsAllotted: number;
    criteriaBApplicableUnits: number;
    criteriaBUnitsEarned: number;
    criteriaBScorePct: number;
    
    totalApplicableUnits: number;
    totalUnitsEarned: number;
    overallHealthScorePct: number;
    
    healthRating: ScheduleHealthRating;
    criticalGatePassed: boolean;
    criticalItemsCount: number;
    criticalItemsPassed: number;
    criticalItemsFailedOrWarning: number;
    
    submissionVerdict: string;
    submissionVerdictType: 'accepted' | 'accepted_with_comments' | 'resubmit_required';
    
    statusCounts: {
      pass: number;
      warning: number;
      fail: number;
      pending: number;
      na: number;
    };
  };

  themes: ThemeSummary[];
  parameters: HealthCheckParameter[];
  rankedDeficiencies: HealthCheckParameter[];

  statisticalDistributions: {
    remainingDurationRanges: RangeBucket[];
    lagsAndLeadsRanges: RangeBucket[];
    totalFloatRanges: RangeBucket[];
    resourcesTypeBreakdown: ResourceSummaryItem[];
    calendarAssignmentBreakdown: CalendarSummaryItem[];
    scatterPlotPoints: ScatterPoint[];
  };
}
