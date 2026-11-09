import {
  Activity,
  ActivityStatus,
  ActivityType,
  Calendar,
  DcmaAuditResult,
  DcmaCheckItem,
  ParsedProject,
  ProjectMetadata,
  ProjectStatistics,
  Relationship,
  RelationshipType,
  Resource,
  ResourceAssignment,
  ResourceType,
  WbsNode,
  XerFileHeader,
  XerRawData,
  XerRawTable,
} from '../types/xer';

/**
 * Parses raw text from a Primavera P6 .xer file into structured raw tables
 */
export function parseRawXer(content: string, fileName = 'project.xer'): XerRawData {
  const lines = content.split(/\r?\n/);
  const header: XerFileHeader = {
    version: '8.3',
    exportDate: new Date().toISOString().split('T')[0],
    user: 'P6 User',
    dbType: 'PROJ',
  };

  const tables = new Map<string, XerRawTable>();
  let currentTable: XerRawTable | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') continue;

    // End of export
    if (line.startsWith('%E')) {
      break;
    }

    // Header record: ERMHDR\t8.3\t2023-11-01\tPROJ\tPROJECT
    if (line.startsWith('ERMHDR')) {
      const parts = line.split('\t');
      if (parts.length > 1) header.version = parts[1];
      if (parts.length > 2) header.exportDate = parts[2];
      if (parts.length > 3) header.dbType = parts[3];
      if (parts.length > 4) header.projectName = parts[4];
      continue;
    }

    // Table declaration: %T\tTABLE_NAME
    if (line.startsWith('%T')) {
      const parts = line.split('\t');
      const tableName = (parts[1] || '').trim();
      if (tableName) {
        currentTable = {
          name: tableName,
          fields: [],
          records: [],
        };
        tables.set(tableName, currentTable);
      }
      continue;
    }

    // Fields line: %F\tcol1\tcol2\tcol3
    if (line.startsWith('%F')) {
      if (currentTable) {
        const parts = line.split('\t');
        // skip the %F marker
        currentTable.fields = parts.slice(1).map((f) => f.trim());
      }
      continue;
    }

    // Record line: %R\tval1\tval2\tval3
    if (line.startsWith('%R')) {
      if (currentTable && currentTable.fields.length > 0) {
        const parts = line.split('\t');
        const vals = parts.slice(1);
        const record: Record<string, string> = {};
        for (let f = 0; f < currentTable.fields.length; f++) {
          const fieldName = currentTable.fields[f];
          record[fieldName] = vals[f] !== undefined ? vals[f] : '';
        }
        currentTable.records.push(record);
      }
      continue;
    }
  }

  return {
    header,
    tables,
    rawText: content,
    fileName,
    fileSizeBytes: new Blob([content]).size,
  };
}

/**
 * Converts Primavera date string (e.g. "2024-03-15 08:00", "2024-03-15", "15-MAR-24") to standardized YYYY-MM-DD
 */
export function normalizeDate(dateStr?: string): string | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;
  const clean = dateStr.trim();

  // If format is like "2024-03-15 08:00" or "2024-03-15"
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.substring(0, 10);
  }

  // If format is like "15-MAR-24" or "15-MAR-2024"
  const p6Match = clean.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/);
  if (p6Match) {
    const day = p6Match[1].padStart(2, '0');
    const monthMap: Record<string, string> = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
    };
    const month = monthMap[p6Match[2].toUpperCase()] || '01';
    let year = p6Match[3];
    if (year.length === 2) {
      year = parseInt(year, 10) > 70 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  // Try standard JS date parse
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return clean.split(' ')[0];
}

/**
 * Full parser transforming raw XER tables into a complete relational project model
 */
export function parseXerProject(content: string, fileName = 'project.xer'): ParsedProject {
  const rawData = parseRawXer(content, fileName);
  const { tables, header } = rawData;

  // 1. PROJECT table
  const projTable = tables.get('PROJECT');
  let projRecord: Record<string, string> = {};
  if (projTable && projTable.records.length > 0) {
    projRecord = projTable.records[0];
  }

  const projId = projRecord['proj_id'] || '1';
  const projCode = projRecord['proj_short_name'] || header.projectName || 'PROJECT-1';
  const projName = projRecord['task_code_base'] || projRecord['proj_short_name'] || header.projectName || 'Primavera P6 Project';
  const planStartDate = normalizeDate(projRecord['plan_start_date']);
  const planFinishDate = normalizeDate(projRecord['plan_end_date']);
  const dataDate = normalizeDate(projRecord['last_recalc_date']) || planStartDate || new Date().toISOString().split('T')[0];

  const metadata: ProjectMetadata = {
    id: projId,
    code: projCode,
    name: projName,
    planStartDate,
    planFinishDate,
    dataDate,
    status: projRecord['status_code'] || 'Active',
    createdDate: normalizeDate(projRecord['add_date']),
    lastUpdateDate: normalizeDate(projRecord['last_recalc_date']),
    currencySymbol: '$',
  };

  // 2. CALENDAR table
  const clndrTable = tables.get('CALENDAR');
  const calendars: Calendar[] = [];
  const clndrMap = new Map<string, Calendar>();

  if (clndrTable) {
    for (const rec of clndrTable.records) {
      const cal: Calendar = {
        id: rec['clndr_id'],
        name: rec['clndr_name'] || 'Standard Calendar',
        hoursPerDay: parseFloat(rec['day_hr_cnt'] || '8') || 8,
      };
      calendars.push(cal);
      clndrMap.set(cal.id, cal);
    }
  }

  // 3. PROJWBS table (Work Breakdown Structure)
  const wbsTable = tables.get('PROJWBS');
  const rawWbsNodes: WbsNode[] = [];
  const wbsMap = new Map<string, WbsNode>();

  if (wbsTable) {
    for (const rec of wbsTable.records) {
      const wbsId = rec['wbs_id'];
      const parentWbsId = rec['parent_wbs_id'] && rec['parent_wbs_id'] !== wbsId ? rec['parent_wbs_id'] : undefined;
      const code = rec['wbs_short_name'] || wbsId;
      const name = rec['wbs_name'] || `WBS ${code}`;

      const node: WbsNode = {
        id: wbsId,
        projId: rec['proj_id'] || projId,
        parentWbsId,
        code,
        name,
        fullPath: code,
        level: 0,
        children: [],
        activityCount: 0,
        completedCount: 0,
        inProgressCount: 0,
        notStartedCount: 0,
        criticalCount: 0,
        totalDurationDays: 0,
        avgProgressPct: 0,
        totalBudgetCost: 0,
      };
      rawWbsNodes.push(node);
      wbsMap.set(wbsId, node);
    }
  }

  // Build hierarchical WBS tree
  const rootWbsNodes: WbsNode[] = [];
  for (const node of rawWbsNodes) {
    if (node.parentWbsId && wbsMap.has(node.parentWbsId)) {
      const parent = wbsMap.get(node.parentWbsId)!;
      parent.children.push(node);
    } else {
      rootWbsNodes.push(node);
    }
  }

  // Calculate fullPath and levels
  function updateWbsPaths(nodes: WbsNode[], currentPath = '', currentLevel = 0) {
    for (const n of nodes) {
      n.level = currentLevel;
      n.fullPath = currentPath ? `${currentPath} > ${n.code} ${n.name}` : `${n.code} ${n.name}`;
      if (n.children.length > 0) {
        updateWbsPaths(n.children, n.fullPath, currentLevel + 1);
      }
    }
  }
  updateWbsPaths(rootWbsNodes);

  // 4. RSRC table (Resources)
  const rsrcTable = tables.get('RSRC');
  const resources: Resource[] = [];
  const rsrcMap = new Map<string, Resource>();

  if (rsrcTable) {
    for (const rec of rsrcTable.records) {
      const rsrcId = rec['rsrc_id'];
      let rType: ResourceType = 'RT_Labor';
      if (rec['rsrc_type'] === 'RT_Nonlabor') rType = 'RT_Nonlabor';
      else if (rec['rsrc_type'] === 'RT_Mat') rType = 'RT_Mat';

      const rsrc: Resource = {
        id: rsrcId,
        code: rec['rsrc_short_name'] || rsrcId,
        name: rec['rsrc_name'] || rec['rsrc_short_name'] || `Resource ${rsrcId}`,
        type: rType,
        unit: rec['unit_id'] || 'hr',
        totalAssignedUnits: 0,
        totalCost: 0,
        assignedActivitiesCount: 0,
      };
      resources.push(rsrc);
      rsrcMap.set(rsrcId, rsrc);
    }
  }

  // 5. TASKRSRC table (Resource Assignments)
  const taskRsrcTable = tables.get('TASKRSRC');
  const activityAssignmentsMap = new Map<string, ResourceAssignment[]>();

  if (taskRsrcTable) {
    for (const rec of taskRsrcTable.records) {
      const taskId = rec['task_id'];
      const rsrcId = rec['rsrc_id'];
      const rsrc = rsrcMap.get(rsrcId);

      const targetUnits = parseFloat(rec['target_qty'] || '0') || 0;
      const actUnits = parseFloat(rec['act_qty'] || '0') || 0;
      const targetCost = parseFloat(rec['target_cost'] || '0') || 0;
      const actCost = parseFloat(rec['act_cost'] || '0') || 0;

      const assignment: ResourceAssignment = {
        id: rec['task_rsrc_id'] || `${taskId}_${rsrcId}`,
        taskId,
        resourceId: rsrcId,
        resourceCode: rsrc ? rsrc.code : rsrcId,
        resourceName: rsrc ? rsrc.name : `Resource ${rsrcId}`,
        resourceType: rsrc ? rsrc.type : 'RT_Labor',
        targetUnits,
        actUnits,
        targetCost,
        actCost,
      };

      if (!activityAssignmentsMap.has(taskId)) {
        activityAssignmentsMap.set(taskId, []);
      }
      activityAssignmentsMap.get(taskId)!.push(assignment);

      // Accumulate on resource
      if (rsrc) {
        rsrc.totalAssignedUnits += targetUnits;
        rsrc.totalCost += targetCost;
        rsrc.assignedActivitiesCount += 1;
      }
    }
  }

  // 6. TASKPRED table (Logic Relationships)
  const predTable = tables.get('TASKPRED');
  const allRelationships: Relationship[] = [];
  const predsByTask = new Map<string, Relationship[]>();
  const succsByTask = new Map<string, Relationship[]>();

  if (predTable) {
    for (const rec of predTable.records) {
      const taskId = rec['task_id']; // Successor task
      const predTaskId = rec['pred_task_id']; // Predecessor task
      const predType = (rec['pred_type'] || 'PR_FS') as RelationshipType;
      const lagHours = parseFloat(rec['lag_hr_cnt'] || '0') || 0;
      const lagDays = Math.round((lagHours / 8) * 10) / 10;

      const rel: Relationship = {
        id: rec['task_pred_id'] || `${taskId}_${predTaskId}`,
        taskId,
        predTaskId,
        type: predType,
        lagHours,
        lagDays,
        driving: rec['driving_path_flag'] === 'Y',
      };

      allRelationships.push(rel);

      if (!predsByTask.has(taskId)) predsByTask.set(taskId, []);
      predsByTask.get(taskId)!.push(rel);

      if (!succsByTask.has(predTaskId)) succsByTask.set(predTaskId, []);
      succsByTask.get(predTaskId)!.push(rel);
    }
  }

  // 7. TASK table (Activities)
  const taskTable = tables.get('TASK');
  const activities: Activity[] = [];
  const taskMap = new Map<string, Activity>();

  if (taskTable) {
    for (const rec of taskTable.records) {
      const id = rec['task_id'];
      const code = rec['task_code'] || id;
      const name = rec['task_name'] || `Activity ${code}`;
      const wbsId = rec['wbs_id'];
      const wbsNode = wbsMap.get(wbsId);

      // Status
      let status: ActivityStatus = 'TK_NotStart';
      if (rec['status_code'] === 'TK_Complete') status = 'TK_Complete';
      else if (rec['status_code'] === 'TK_Active') status = 'TK_Active';

      // Type
      let type: ActivityType = 'TT_Task';
      if (rec['task_type'] === 'TT_Mile' || rec['task_type'] === 'TT_StartMile') type = 'TT_Mile';
      else if (rec['task_type'] === 'TT_FinMile') type = 'TT_FinMile';
      else if (rec['task_type'] === 'TT_LOE') type = 'TT_LOE';
      else if (rec['task_type'] === 'TT_WBS') type = 'TT_WBS';

      const isMilestone = type === 'TT_Mile' || type === 'TT_FinMile';

      // Calendar
      const calId = rec['clndr_id'];
      const cal = clndrMap.get(calId);
      const hoursPerDay = cal && cal.hoursPerDay > 0 ? cal.hoursPerDay : 8.0;

      // Dates
      const startDate = normalizeDate(rec['act_start_date'] || rec['target_start_date'] || rec['early_start_date']);
      const finishDate = normalizeDate(rec['act_end_date'] || rec['target_end_date'] || rec['early_end_date']);
      const earlyStartDate = normalizeDate(rec['early_start_date']);
      const earlyFinishDate = normalizeDate(rec['early_end_date']);
      const lateStartDate = normalizeDate(rec['late_start_date']);
      const lateFinishDate = normalizeDate(rec['late_end_date']);
      const actualStartDate = normalizeDate(rec['act_start_date']);
      const actualFinishDate = normalizeDate(rec['act_end_date']);
      const targetStartDate = normalizeDate(rec['target_start_date']);
      const targetFinishDate = normalizeDate(rec['target_end_date']);

      // Duration in days (from hours, accurately divided by assigned calendar's hours per day)
      const rawTargetHours = parseFloat(rec['target_drtn_hr_cnt'] || '0') || 0;
      const rawRemainHours = parseFloat(rec['remain_drtn_hr_cnt'] || '0') || 0;
      const rawActWorkQty = parseFloat(rec['act_work_qty'] || '0') || 0;
      const rawActDrtnHours = parseFloat(rec['act_drtn_hr_cnt'] || '0') || 0;

      let origDurationDays = 0;
      let remainDurationDays = 0;
      let actualDurationDays = 0;

      if (!isMilestone) {
        if (rawTargetHours > 0) {
          origDurationDays = Math.round((rawTargetHours / hoursPerDay) * 10) / 10;
        } else if (rawRemainHours > 0) {
          origDurationDays = Math.round((rawRemainHours / hoursPerDay) * 10) / 10;
        } else if (startDate && finishDate) {
          const sDate = new Date(startDate);
          const fDate = new Date(finishDate);
          const diffDays = Math.max(1, Math.round((fDate.getTime() - sDate.getTime()) / (1000 * 3600 * 24)));
          origDurationDays = diffDays;
        }

        if (status === 'TK_Complete') {
          remainDurationDays = 0;
          actualDurationDays = rawActDrtnHours > 0
            ? Math.round((rawActDrtnHours / hoursPerDay) * 10) / 10
            : origDurationDays;
        } else if (status === 'TK_Active') {
          remainDurationDays = rawRemainHours > 0
            ? Math.round((rawRemainHours / hoursPerDay) * 10) / 10
            : origDurationDays;
          actualDurationDays = rawActDrtnHours > 0
            ? Math.round((rawActDrtnHours / hoursPerDay) * 10) / 10
            : Math.max(0, origDurationDays - remainDurationDays);
        } else {
          // TK_NotStart
          remainDurationDays = origDurationDays;
          actualDurationDays = 0;
        }
      }

      // Float (in days, divided by assigned calendar's hours per day)
      const rawTf = rec['total_float_hr_cnt'];
      const rawFf = rec['free_float_hr_cnt'];
      let totalFloatDays = 0;
      let freeFloatDays = 0;

      if (rawTf !== undefined && rawTf !== '') {
        totalFloatDays = Math.round((parseFloat(rawTf) / hoursPerDay) * 10) / 10;
      }
      if (rawFf !== undefined && rawFf !== '') {
        freeFloatDays = Math.round((parseFloat(rawFf) / hoursPerDay) * 10) / 10;
      }

      // Critical path condition: incomplete activities with totalFloatDays <= 0
      const isCritical = status !== 'TK_Complete' && totalFloatDays <= 0;

      // Progress %
      let physCompletePct = parseFloat(rec['phys_complete_pct'] || '0') || 0;
      if (status === 'TK_Complete') physCompletePct = 100;
      if (status === 'TK_NotStart') physCompletePct = 0;

      const activity: Activity = {
        id,
        projId: rec['proj_id'] || projId,
        wbsId,
        code,
        name,
        status,
        type,
        origDurationDays,
        remainDurationDays,
        actualDurationDays,
        startDate,
        finishDate,
        earlyStartDate,
        earlyFinishDate,
        lateStartDate,
        lateFinishDate,
        actualStartDate,
        actualFinishDate,
        targetStartDate,
        targetFinishDate,
        totalFloatDays,
        freeFloatDays,
        isCritical,
        physCompletePct,
        predecessors: [],
        successors: [],
        assignments: activityAssignmentsMap.get(id) || [],
        wbsCode: wbsNode ? wbsNode.code : 'ROOT',
        wbsName: wbsNode ? wbsNode.name : 'Project Root',
        wbsPath: wbsNode ? wbsNode.fullPath : '',
        calendarId: calId,
        calendarName: cal ? cal.name : undefined,
        constraintType: rec['cstr_type'],
        constraintDate: normalizeDate(rec['cstr_date']),
      };

      activities.push(activity);
      taskMap.set(id, activity);

      // Rollup on WBS node
      if (wbsNode) {
        wbsNode.activityCount += 1;
        if (status === 'TK_Complete') wbsNode.completedCount += 1;
        else if (status === 'TK_Active') wbsNode.inProgressCount += 1;
        else wbsNode.notStartedCount += 1;
        if (isCritical) wbsNode.criticalCount += 1;

        if (startDate && (!wbsNode.minStartDate || startDate < wbsNode.minStartDate)) {
          wbsNode.minStartDate = startDate;
        }
        if (finishDate && (!wbsNode.maxFinishDate || finishDate > wbsNode.maxFinishDate)) {
          wbsNode.maxFinishDate = finishDate;
        }
        wbsNode.totalDurationDays += origDurationDays;
      }
    }
  }

  // Connect resolved predecessor & successor codes and names
  for (const act of activities) {
    const rawPreds = predsByTask.get(act.id) || [];
    act.predecessors = rawPreds.map((r) => {
      const predTask = taskMap.get(r.predTaskId);
      return {
        ...r,
        predTaskCode: predTask ? predTask.code : r.predTaskId,
        predTaskName: predTask ? predTask.name : undefined,
      };
    });

    const rawSuccs = succsByTask.get(act.id) || [];
    act.successors = rawSuccs.map((r) => {
      const succTask = taskMap.get(r.taskId);
      return {
        ...r,
        predTaskCode: succTask ? succTask.code : r.taskId,
        predTaskName: succTask ? succTask.name : undefined,
      };
    });
  }

  // Longest Path determination (Oracle Primavera standard)
  let latestProjFinish = '';
  for (const a of activities) {
    if (a.finishDate && (!latestProjFinish || a.finishDate > latestProjFinish)) {
      latestProjFinish = a.finishDate;
    }
  }

  // Find candidate terminal activities finishing at or within 2 days of latest finish
  const terminalCandidates = activities.filter(
    (a) =>
      a.finishDate &&
      (a.successors.length === 0 || a.type === 'TT_FinMile') &&
      Math.abs(new Date(a.finishDate).getTime() - new Date(latestProjFinish).getTime()) <= 86400000 * 2
  );

  const longestPathSet = new Set<string>();
  const traceQueue: string[] = (terminalCandidates.length > 0 ? terminalCandidates : activities.slice(0, 1)).map(
    (a) => a.id
  );
  const visitedTrace = new Set<string>();

  while (traceQueue.length > 0) {
    const curId = traceQueue.shift()!;
    if (visitedTrace.has(curId)) continue;
    visitedTrace.add(curId);
    longestPathSet.add(curId);

    const act = taskMap.get(curId);
    if (!act || act.predecessors.length === 0) continue;

    // Check driving predecessors first
    const drivingPreds = act.predecessors.filter((p) => p.driving);
    if (drivingPreds.length > 0) {
      for (const dp of drivingPreds) {
        if (!visitedTrace.has(dp.predTaskId)) traceQueue.push(dp.predTaskId);
      }
    } else {
      // Trace critical or minimum float predecessors
      let minF = 99999;
      for (const p of act.predecessors) {
        const pred = taskMap.get(p.predTaskId);
        if (pred && pred.totalFloatDays < minF) minF = pred.totalFloatDays;
      }
      const bestPreds = act.predecessors.filter((p) => {
        const pred = taskMap.get(p.predTaskId);
        return pred && pred.totalFloatDays <= Math.max(0, minF);
      });
      for (const bp of bestPreds) {
        if (!visitedTrace.has(bp.predTaskId)) traceQueue.push(bp.predTaskId);
      }
    }
  }

  for (const act of activities) {
    act.isLongestPath = longestPathSet.has(act.id);
  }

  // Calculate WBS roll-up progress
  function calculateWbsProgress(nodes: WbsNode[]) {
    for (const node of nodes) {
      if (node.children.length > 0) {
        calculateWbsProgress(node.children);
        // aggregate children rollups
        for (const child of node.children) {
          node.activityCount += child.activityCount;
          node.completedCount += child.completedCount;
          node.inProgressCount += child.inProgressCount;
          node.notStartedCount += child.notStartedCount;
          node.criticalCount += child.criticalCount;
          if (child.minStartDate && (!node.minStartDate || child.minStartDate < node.minStartDate)) {
            node.minStartDate = child.minStartDate;
          }
          if (child.maxFinishDate && (!node.maxFinishDate || child.maxFinishDate > node.maxFinishDate)) {
            node.maxFinishDate = child.maxFinishDate;
          }
        }
      }
      if (node.activityCount > 0) {
        node.avgProgressPct = Math.round((node.completedCount / node.activityCount) * 100);
      }
    }
  }
  calculateWbsProgress(rootWbsNodes);

  // Compute overall stats
  let totalCrit = 0;
  let totalComp = 0;
  let totalProg = 0;
  let totalNotStart = 0;
  let totalMile = 0;
  let minStart = metadata.planStartDate;
  let maxEnd = metadata.planFinishDate;
  let minFloat = 99999;
  let maxFloat = -99999;

  for (const act of activities) {
    if (act.isCritical) totalCrit++;
    if (act.status === 'TK_Complete') totalComp++;
    else if (act.status === 'TK_Active') totalProg++;
    else totalNotStart++;

    if (act.type === 'TT_Mile' || act.type === 'TT_FinMile') totalMile++;

    if (act.startDate && (!minStart || act.startDate < minStart)) minStart = act.startDate;
    if (act.finishDate && (!maxEnd || act.finishDate > maxEnd)) maxEnd = act.finishDate;

    if (act.totalFloatDays < minFloat) minFloat = act.totalFloatDays;
    if (act.totalFloatDays > maxFloat) maxFloat = act.totalFloatDays;
  }

  if (minFloat === 99999) minFloat = 0;
  if (maxFloat === -99999) maxFloat = 0;

  const totalActCount = activities.length;
  const overallProgressPct = totalActCount > 0 ? Math.round((totalComp / totalActCount) * 100) : 0;

  // Days difference
  let totalDurationDays = 0;
  if (minStart && maxEnd) {
    const s = new Date(minStart).getTime();
    const e = new Date(maxEnd).getTime();
    totalDurationDays = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
  }

  const stats: ProjectStatistics = {
    totalActivities: totalActCount,
    notStartedCount: totalNotStart,
    inProgressCount: totalProg,
    completedCount: totalComp,
    criticalCount: totalCrit,
    milestoneCount: totalMile,
    overallProgressPct,
    startDate: minStart,
    finishDate: maxEnd,
    totalDurationDays,
    totalFloatRange: { min: minFloat, max: maxFloat },
    totalResources: resources.length,
    totalRelationships: allRelationships.length,
  };

  // Perform DCMA 14-Point Health Audit
  const healthAudit = performDcmaAudit(activities, allRelationships, dataDate);

  return {
    metadata,
    activities,
    wbsHierarchy: rootWbsNodes,
    wbsMap,
    resources,
    calendars,
    relationships: allRelationships,
    rawTables: tables,
    rawText: rawData.rawText,
    stats,
    healthAudit,
  };
}

/**
 * Standard DCMA 14-point schedule health assessment for Primavera P6
 */
export function performDcmaAudit(
  activities: Activity[],
  relationships: Relationship[],
  dataDate?: string
): DcmaAuditResult {
  const total = activities.length || 1;
  const checks: DcmaCheckItem[] = [];

  // 1. Logic: Missing Predecessors (Open Starts)
  // Target: < 5% of non-complete tasks (excluding start milestones)
  const openStarts = activities.filter(
    (a) => a.status !== 'TK_Complete' && a.type !== 'TT_Mile' && a.predecessors.length === 0
  );
  const openStartsPct = Math.round((openStarts.length / total) * 1000) / 10;
  checks.push({
    id: 1,
    name: 'Missing Predecessors (Open Starts)',
    description: 'Incomplete tasks with no predecessor logic links, leaving start dates unconstrained.',
    threshold: '< 5%',
    targetPct: 5,
    passed: openStartsPct <= 5,
    actualCount: openStarts.length,
    totalCount: total,
    actualPct: openStartsPct,
    severity: openStartsPct === 0 ? 'pass' : openStartsPct <= 5 ? 'warning' : 'fail',
    affectedActivities: openStarts.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      reason: 'No predecessor relationship defined',
    })),
  });

  // 2. Logic: Missing Successors (Open Finishes)
  // Target: < 5% of non-complete tasks (excluding finish milestones)
  const openFinishes = activities.filter(
    (a) => a.status !== 'TK_Complete' && a.type !== 'TT_FinMile' && a.successors.length === 0
  );
  const openFinishesPct = Math.round((openFinishes.length / total) * 1000) / 10;
  checks.push({
    id: 2,
    name: 'Missing Successors (Open Finishes)',
    description: 'Incomplete tasks with no successor logic links, creating orphaned downstream branches.',
    threshold: '< 5%',
    targetPct: 5,
    passed: openFinishesPct <= 5,
    actualCount: openFinishes.length,
    totalCount: total,
    actualPct: openFinishesPct,
    severity: openFinishesPct === 0 ? 'pass' : openFinishesPct <= 5 ? 'warning' : 'fail',
    affectedActivities: openFinishes.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      reason: 'No successor relationship defined',
    })),
  });

  // 3. Leads (Negative Lags)
  // Target: 0% leads allowed
  const leads = relationships.filter((r) => r.lagHours < 0);
  const totalRels = relationships.length || 1;
  const leadsPct = Math.round((leads.length / totalRels) * 1000) / 10;
  checks.push({
    id: 3,
    name: 'Relationship Leads (Negative Lag)',
    description: 'Negative lag modifies logic artificially and is prohibited under DCMA standards.',
    threshold: '0%',
    targetPct: 0,
    passed: leads.length === 0,
    actualCount: leads.length,
    totalCount: totalRels,
    actualPct: leadsPct,
    severity: leads.length === 0 ? 'pass' : 'fail',
    affectedActivities: leads.map((r) => ({
      id: r.id,
      code: r.predTaskCode || r.taskId,
      name: `Lead lag of ${r.lagDays} days on logic link`,
      reason: `Negative lag (${r.lagDays}d) violates standard CPM forward pass`,
    })),
  });

  // 4. Lags (Positive Lag)
  // Target: < 10% of relationships
  const positiveLags = relationships.filter((r) => r.lagHours > 0);
  const positiveLagsPct = Math.round((positiveLags.length / totalRels) * 1000) / 10;
  checks.push({
    id: 4,
    name: 'Relationship Lags (Positive Lag)',
    description: 'Excessive positive lags obscure visibility; discrete activity tracking is preferred.',
    threshold: '< 10%',
    targetPct: 10,
    passed: positiveLagsPct <= 10,
    actualCount: positiveLags.length,
    totalCount: totalRels,
    actualPct: positiveLagsPct,
    severity: positiveLagsPct <= 5 ? 'pass' : positiveLagsPct <= 10 ? 'warning' : 'fail',
    affectedActivities: positiveLags.map((r) => ({
      id: r.id,
      code: r.predTaskCode || r.taskId,
      name: `Lag of +${r.lagDays} days`,
      reason: `Positive lag (+${r.lagDays}d) on dependency`,
    })),
  });

  // 5. Relationship Types: Finish-to-Start (FS) dominance
  // Target: >= 90% of logic links should be FS
  const fsLinks = relationships.filter((r) => r.type === 'PR_FS');
  const nonFsLinks = relationships.filter((r) => r.type !== 'PR_FS');
  const fsPct = Math.round((fsLinks.length / totalRels) * 1000) / 10;
  checks.push({
    id: 5,
    name: 'Relationship Type (FS Dominance)',
    description: 'Finish-to-Start relationships represent clear chronological progression and should exceed 90%.',
    threshold: '>= 90%',
    targetPct: 90,
    passed: fsPct >= 90,
    actualCount: fsLinks.length,
    totalCount: totalRels,
    actualPct: fsPct,
    severity: fsPct >= 90 ? 'pass' : fsPct >= 80 ? 'warning' : 'fail',
    affectedActivities: nonFsLinks.map((r) => ({
      id: r.id,
      code: r.predTaskCode || r.taskId,
      name: `Type: ${r.type.replace('PR_', '')}`,
      reason: `Non-standard relationship type (${r.type.replace('PR_', '')})`,
    })),
  });

  // 6. Hard Constraints
  // Target: < 5% of incomplete activities
  const hardConstraintKeywords = ['MAND', 'MUST', 'CS_MAND', 'CS_MS'];
  const constrainedActivities = activities.filter((a) => {
    if (!a.constraintType) return false;
    const c = a.constraintType.toUpperCase();
    return hardConstraintKeywords.some((k) => c.includes(k));
  });
  const constrainedPct = Math.round((constrainedActivities.length / total) * 1000) / 10;
  checks.push({
    id: 6,
    name: 'Hard Constraints',
    description: 'Mandatory constraints override CPM schedule float logic and prevent accurate forecasting.',
    threshold: '< 5%',
    targetPct: 5,
    passed: constrainedPct <= 5,
    actualCount: constrainedActivities.length,
    totalCount: total,
    actualPct: constrainedPct,
    severity: constrainedPct === 0 ? 'pass' : constrainedPct <= 5 ? 'warning' : 'fail',
    affectedActivities: constrainedActivities.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      reason: `Hard constraint (${a.constraintType}) set on ${a.constraintDate || 'activity'}`,
    })),
  });

  // 7. High Float (> 44 working days / 2 calendar months)
  // Target: < 5%
  const highFloat = activities.filter((a) => a.status !== 'TK_Complete' && a.totalFloatDays > 44);
  const highFloatPct = Math.round((highFloat.length / total) * 1000) / 10;
  checks.push({
    id: 7,
    name: 'High Total Float (> 44 days)',
    description: 'Activities with excessive float often reflect missing successor logic or disconnected networks.',
    threshold: '< 5%',
    targetPct: 5,
    passed: highFloatPct <= 5,
    actualCount: highFloat.length,
    totalCount: total,
    actualPct: highFloatPct,
    severity: highFloatPct <= 5 ? 'pass' : highFloatPct <= 10 ? 'warning' : 'fail',
    affectedActivities: highFloat.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      reason: `Total float is ${a.totalFloatDays} days (> 44d threshold)`,
    })),
  });

  // 8. Negative Total Float (Compression / Delay)
  // Target: 0%
  const negativeFloat = activities.filter((a) => a.status !== 'TK_Complete' && a.totalFloatDays < 0);
  const negativeFloatPct = Math.round((negativeFloat.length / total) * 1000) / 10;
  checks.push({
    id: 8,
    name: 'Negative Total Float',
    description: 'Negative float signifies the project is forecasted to miss contracted completion dates.',
    threshold: '0%',
    targetPct: 0,
    passed: negativeFloat.length === 0,
    actualCount: negativeFloat.length,
    totalCount: total,
    actualPct: negativeFloatPct,
    severity: negativeFloat.length === 0 ? 'pass' : 'fail',
    affectedActivities: negativeFloat.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      reason: `Critical delay: total float is ${a.totalFloatDays} days`,
    })),
  });

  // 9. High Duration (> 44 working days)
  // Target: < 5% (excluding LOE/Summary)
  const highDuration = activities.filter(
    (a) => a.type === 'TT_Task' && a.origDurationDays > 44
  );
  const highDurationPct = Math.round((highDuration.length / total) * 1000) / 10;
  checks.push({
    id: 9,
    name: 'High Activity Duration (> 44 days)',
    description: 'Activities longer than 2 months should be decomposed into smaller manageable tasks.',
    threshold: '< 5%',
    targetPct: 5,
    passed: highDurationPct <= 5,
    actualCount: highDuration.length,
    totalCount: total,
    actualPct: highDurationPct,
    severity: highDurationPct <= 5 ? 'pass' : highDurationPct <= 10 ? 'warning' : 'fail',
    affectedActivities: highDuration.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      reason: `Duration is ${a.origDurationDays} days (> 44d)`,
    })),
  });

  // 10. Invalid Dates (forecast in past or actual in future)
  const todayStr = dataDate || new Date().toISOString().split('T')[0];
  const invalidDates = activities.filter((a) => {
    // Actual start after data date
    if (a.actualStartDate && a.actualStartDate > todayStr) return true;
    // In progress or not started with early finish in past
    if (a.status !== 'TK_Complete' && a.finishDate && a.finishDate < todayStr) return true;
    return false;
  });
  const invalidDatesPct = Math.round((invalidDates.length / total) * 1000) / 10;
  checks.push({
    id: 10,
    name: 'Invalid Status Dates',
    description: 'No actual progress dates in the future; incomplete tasks cannot have finish dates in the past.',
    threshold: '0%',
    targetPct: 0,
    passed: invalidDates.length === 0,
    actualCount: invalidDates.length,
    totalCount: total,
    actualPct: invalidDatesPct,
    severity: invalidDates.length === 0 ? 'pass' : 'fail',
    affectedActivities: invalidDates.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      reason: `Forecast date ${a.finishDate || a.startDate} conflicts with data date (${todayStr})`,
    })),
  });

  // 11. Resource Loading
  // Target: > 80% for fully loaded project schedules
  const resourceLoaded = activities.filter((a) => a.type === 'TT_Task' && a.assignments.length > 0);
  const tasksCount = activities.filter((a) => a.type === 'TT_Task').length || 1;
  const resourcePct = Math.round((resourceLoaded.length / tasksCount) * 1000) / 10;
  checks.push({
    id: 11,
    name: 'Resource Loading Coverage',
    description: 'Measures percentage of work activities that have labor or equipment resources assigned.',
    threshold: '>= 80%',
    targetPct: 80,
    passed: resourcePct >= 80,
    actualCount: resourceLoaded.length,
    totalCount: tasksCount,
    actualPct: resourcePct,
    severity: resourcePct >= 80 ? 'pass' : resourcePct >= 50 ? 'warning' : 'fail',
    affectedActivities: activities
      .filter((a) => a.type === 'TT_Task' && a.assignments.length === 0)
      .slice(0, 50)
      .map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        reason: 'No resource or crew assigned',
      })),
  });

  // 12. Missed Activities (Scheduled to finish before data date but incomplete)
  const missedTasks = activities.filter(
    (a) => a.status !== 'TK_Complete' && a.targetFinishDate && a.targetFinishDate < todayStr
  );
  const missedTasksPct = Math.round((missedTasks.length / total) * 1000) / 10;
  checks.push({
    id: 12,
    name: 'Missed Milestone & Finish Tasks',
    description: 'Activities baseline scheduled to finish before the status date that are not yet marked complete.',
    threshold: '< 5%',
    targetPct: 5,
    passed: missedTasksPct <= 5,
    actualCount: missedTasks.length,
    totalCount: total,
    actualPct: missedTasksPct,
    severity: missedTasksPct === 0 ? 'pass' : missedTasksPct <= 5 ? 'warning' : 'fail',
    affectedActivities: missedTasks.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      reason: `Planned finish was ${a.targetFinishDate}; still ${a.status.replace('TK_', '')}`,
    })),
  });

  // 13. Critical Path Continuity
  const criticalTasks = activities.filter((a) => a.isCritical);
  const hasCritical = criticalTasks.length > 0;
  checks.push({
    id: 13,
    name: 'Critical Path Continuity',
    description: 'Verifies the network exhibits an unbroken critical path driving project completion.',
    threshold: 'Continuous',
    targetPct: 100,
    passed: hasCritical,
    actualCount: criticalTasks.length,
    totalCount: total,
    actualPct: Math.round((criticalTasks.length / total) * 1000) / 10,
    severity: hasCritical ? 'pass' : 'warning',
    affectedActivities: criticalTasks.slice(0, 30).map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      reason: `Critical activity with Total Float = ${a.totalFloatDays}d`,
    })),
  });

  // 14. Float Consistency
  const anomalousFloat = activities.filter((a) => a.freeFloatDays > a.totalFloatDays);
  checks.push({
    id: 14,
    name: 'Float Logic Consistency',
    description: 'Free float must not mathematically exceed Total float in a properly calculated CPM schedule.',
    threshold: '100% Valid',
    targetPct: 100,
    passed: anomalousFloat.length === 0,
    actualCount: total - anomalousFloat.length,
    totalCount: total,
    actualPct: Math.round(((total - anomalousFloat.length) / total) * 1000) / 10,
    severity: anomalousFloat.length === 0 ? 'pass' : 'fail',
    affectedActivities: anomalousFloat.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      reason: `Free Float (${a.freeFloatDays}d) > Total Float (${a.totalFloatDays}d)`,
    })),
  });

  // Score calculation
  const passedCount = checks.filter((c) => c.passed).length;
  const overallScorePct = Math.round((passedCount / checks.length) * 100);

  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
  if (overallScorePct >= 90) grade = 'A';
  else if (overallScorePct >= 80) grade = 'B';
  else if (overallScorePct >= 70) grade = 'C';
  else if (overallScorePct >= 60) grade = 'D';
  else grade = 'F';

  let summaryNote = `Schedule passes ${passedCount} of 14 DCMA quality metrics (${overallScorePct}% compliance).`;
  if (grade === 'A') {
    summaryNote += ' Outstanding network integrity, clean forward/backward logic passes.';
  } else if (grade === 'B' || grade === 'C') {
    summaryNote += ' Minor logic deficiencies detected; review open-ended tasks and high float chains.';
  } else {
    summaryNote += ' Significant logic breaches detected; schedule requires remediation before baseline lock.';
  }

  return {
    overallScorePct,
    grade,
    checks,
    summaryNote,
  };
}

/**
 * Re-serializes project into valid Oracle Primavera P6 XER file format
 */
export function exportProjectToXer(project: ParsedProject): string {
  const lines: string[] = [];

  // Header line
  lines.push(`ERMHDR\t8.3\t${new Date().toISOString().split('T')[0]}\tPROJ\t${project.metadata.code}`);

  // PROJECT table
  lines.push('%T\tPROJECT');
  lines.push('%F\tproj_id\tproj_short_name\ttask_code_base\tplan_start_date\tplan_end_date\tlast_recalc_date\tstatus_code');
  lines.push(
    `%R\t${project.metadata.id}\t${project.metadata.code}\t${project.metadata.name}\t${project.metadata.planStartDate || ''}\t${project.metadata.planFinishDate || ''}\t${project.metadata.dataDate || ''}\tActive`
  );

  // PROJWBS table
  lines.push('%T\tPROJWBS');
  lines.push('%F\twbs_id\tproj_id\tparent_wbs_id\twbs_short_name\twbs_name\tseq_num\tstatus_code');
  for (const [wbsId, wbs] of project.wbsMap.entries()) {
    lines.push(
      `%R\t${wbsId}\t${wbs.projId}\t${wbs.parentWbsId || ''}\t${wbs.code}\t${wbs.name}\t1\tWS_Open`
    );
  }

  // CALENDAR table
  lines.push('%T\tCALENDAR');
  lines.push('%F\tclndr_id\tclndr_name\tday_hr_cnt\tclndr_type');
  for (const cal of project.calendars) {
    lines.push(`%R\t${cal.id}\t${cal.name}\t${cal.hoursPerDay}\tCA_Project`);
  }

  // RSRC table
  lines.push('%T\tRSRC');
  lines.push('%F\trsrc_id\trsrc_short_name\trsrc_name\trsrc_type\tunit_id');
  for (const r of project.resources) {
    lines.push(`%R\t${r.id}\t${r.code}\t${r.name}\t${r.type}\t${r.unit}`);
  }

  // TASK table
  lines.push('%T\tTASK');
  lines.push(
    '%F\ttask_id\tproj_id\twbs_id\ttask_code\ttask_name\tstatus_code\ttask_type\tact_start_date\tact_end_date\ttarget_start_date\ttarget_end_date\tearly_start_date\tearly_end_date\tlate_start_date\tlate_end_date\ttarget_drtn_hr_cnt\tremain_drtn_hr_cnt\tact_work_qty\tphys_complete_pct\ttotal_float_hr_cnt\tfree_float_hr_cnt\tclndr_id'
  );
  for (const a of project.activities) {
    const targetHr = a.origDurationDays * 8;
    const remainHr = a.remainDurationDays * 8;
    const actHr = a.actualDurationDays * 8;
    const tfHr = a.totalFloatDays * 8;
    const ffHr = a.freeFloatDays * 8;

    lines.push(
      `%R\t${a.id}\t${a.projId}\t${a.wbsId}\t${a.code}\t${a.name}\t${a.status}\t${a.type}\t${a.actualStartDate || ''}\t${a.actualFinishDate || ''}\t${a.targetStartDate || a.startDate || ''}\t${a.targetFinishDate || a.finishDate || ''}\t${a.earlyStartDate || a.startDate || ''}\t${a.earlyFinishDate || a.finishDate || ''}\t${a.lateStartDate || ''}\t${a.lateFinishDate || ''}\t${targetHr}\t${remainHr}\t${actHr}\t${a.physCompletePct}\t${tfHr}\t${ffHr}\t${a.calendarId || '1'}`
    );
  }

  // TASKPRED table
  lines.push('%T\tTASKPRED');
  lines.push('%F\ttask_pred_id\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt\tdriving_path_flag');
  let predCounter = 1;
  for (const rel of project.relationships) {
    lines.push(
      `%R\t${rel.id || predCounter++}\t${rel.taskId}\t${rel.predTaskId}\t${rel.type}\t${rel.lagHours}\t${rel.driving ? 'Y' : 'N'}`
    );
  }

  // TASKRSRC table
  lines.push('%T\tTASKRSRC');
  lines.push('%F\ttask_rsrc_id\ttask_id\trsrc_id\ttarget_qty\tact_qty\ttarget_cost\tact_cost');
  let assignCounter = 1;
  for (const a of project.activities) {
    for (const assign of a.assignments) {
      lines.push(
        `%R\t${assign.id || assignCounter++}\t${assign.taskId}\t${assign.resourceId}\t${assign.targetUnits}\t${assign.actUnits}\t${assign.targetCost}\t${assign.actCost}`
      );
    }
  }

  // End of file
  lines.push('%E');

  return lines.join('\n');
}
