/**
 * TypeScript types for Oracle Primavera P6 XER file format and project models
 */

export interface XerRawTable {
  name: string;
  fields: string[];
  records: Record<string, string>[];
}

export interface XerFileHeader {
  version: string;
  exportDate: string;
  user: string;
  dbType: string;
  projectName?: string;
}

export interface XerRawData {
  header: XerFileHeader;
  tables: Map<string, XerRawTable>;
  rawText: string;
  fileName: string;
  fileSizeBytes: number;
}

export type ActivityStatus = 'TK_NotStart' | 'TK_Active' | 'TK_Complete';
export type ActivityType = 'TT_Task' | 'TT_Mile' | 'TT_FinMile' | 'TT_LOE' | 'TT_WBS';
export type RelationshipType = 'PR_FS' | 'PR_SS' | 'PR_FF' | 'PR_SF';
export type ResourceType = 'RT_Labor' | 'RT_Nonlabor' | 'RT_Mat';

export interface Relationship {
  id: string;
  taskId: string;
  predTaskId: string;
  predTaskCode?: string;
  predTaskName?: string;
  type: RelationshipType;
  lagHours: number;
  lagDays: number;
  driving: boolean;
}

export interface ResourceAssignment {
  id: string;
  taskId: string;
  resourceId: string;
  resourceCode: string;
  resourceName: string;
  resourceType: ResourceType;
  targetUnits: number;
  actUnits: number;
  targetCost: number;
  actCost: number;
}

export interface Activity {
  id: string;
  projId: string;
  wbsId: string;
  code: string; // e.g. "A1010"
  name: string;
  status: ActivityStatus;
  type: ActivityType;
  
  // Durations (in days, calculated from hours)
  origDurationDays: number;
  remainDurationDays: number;
  actualDurationDays: number;
  
  // Dates
  startDate?: string;
  finishDate?: string;
  earlyStartDate?: string;
  earlyFinishDate?: string;
  lateStartDate?: string;
  lateFinishDate?: string;
  actualStartDate?: string;
  actualFinishDate?: string;
  targetStartDate?: string;
  targetFinishDate?: string;

  // Float
  totalFloatDays: number;
  freeFloatDays: number;
  isCritical: boolean;
  isLongestPath?: boolean;

  // Progress
  physCompletePct: number; // 0 - 100

  // Logic & Resources
  predecessors: Relationship[];
  successors: Relationship[];
  assignments: ResourceAssignment[];

  // Hierarchy
  wbsCode: string;
  wbsName: string;
  wbsPath: string;
  
  // Raw fields
  calendarId?: string;
  calendarName?: string;
  constraintType?: string;
  constraintDate?: string;
}

export interface WbsNode {
  id: string;
  projId: string;
  parentWbsId?: string;
  code: string;
  name: string;
  fullPath: string;
  level: number;
  children: WbsNode[];
  
  // Aggregated rollups
  activityCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  criticalCount: number;
  minStartDate?: string;
  maxFinishDate?: string;
  totalDurationDays: number;
  avgProgressPct: number;
  totalBudgetCost: number;
}

export interface Resource {
  id: string;
  code: string;
  name: string;
  type: ResourceType;
  unit: string;
  totalAssignedUnits: number;
  totalCost: number;
  assignedActivitiesCount: number;
}

export interface Calendar {
  id: string;
  name: string;
  hoursPerDay: number;
}

export interface ProjectMetadata {
  id: string;
  code: string;
  name: string;
  planStartDate?: string;
  planFinishDate?: string;
  dataDate?: string; // Current progress cutoff date in P6
  status: string;
  createdDate?: string;
  lastUpdateDate?: string;
  currencySymbol: string;
}

export interface ParsedProject {
  metadata: ProjectMetadata;
  activities: Activity[];
  wbsHierarchy: WbsNode[];
  wbsMap: Map<string, WbsNode>;
  resources: Resource[];
  calendars: Calendar[];
  relationships: Relationship[];
  rawTables: Map<string, XerRawTable>;
  rawText: string;
  stats: ProjectStatistics;
  healthAudit: DcmaAuditResult;
}

export interface ProjectStatistics {
  totalActivities: number;
  notStartedCount: number;
  inProgressCount: number;
  completedCount: number;
  criticalCount: number;
  milestoneCount: number;
  overallProgressPct: number;
  startDate?: string;
  finishDate?: string;
  totalDurationDays: number;
  totalFloatRange: { min: number; max: number };
  totalResources: number;
  totalRelationships: number;
}

export interface DcmaCheckItem {
  id: number;
  name: string;
  description: string;
  threshold: string;
  targetPct: number;
  passed: boolean;
  actualCount: number;
  totalCount: number;
  actualPct: number;
  severity: 'pass' | 'warning' | 'fail';
  affectedActivities: { id: string; code: string; name: string; reason: string }[];
}

export interface DcmaAuditResult {
  overallScorePct: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: DcmaCheckItem[];
  summaryNote: string;
}
