import { ParsedProject, Activity, WbsNode } from '../types/xer';
import {
  TilosWbsSection,
  TilosActivityVector,
  TilosDiscipline,
  TilosMonthTick,
} from '../types/tilos';

// Discipline colors matching civil engineering & railway TILOS standards
export const DISCIPLINE_COLORS: Record<TilosDiscipline, string> = {
  'Earthwork & ROW': '#D97706', // Amber-600
  'Piling & Foundation': '#8B5CF6', // Purple-500
  'Piers & Substructure': '#2563EB', // Blue-600
  'Superstructure & Launching': '#0D9488', // Teal-600
  'Track Laying': '#4F46E5', // Indigo-600
  'Stations & Terminals': '#059669', // Emerald-600
  'Electrical & OHE': '#E11D48', // Rose-600
  'Testing & Handover': '#16A34A', // Green-600
  'General Civil': '#64748B', // Slate-500
};

// Classifies activity into construction trade
export function classifyDiscipline(act: Activity): TilosDiscipline {
  const text = `${act.code} ${act.name} ${act.wbsName} ${act.wbsPath || ''}`.toUpperCase();

  if (text.includes('TRACK') || text.includes('RAIL') || text.includes('BALLAST') || text.includes('SLAB') || text.includes('TURNOUT') || text.includes('J-SLAB')) {
    return 'Track Laying';
  }
  if (text.includes('LAUNCH') || text.includes('GIRDER') || text.includes('SUPERSTRUCTURE') || text.includes('DECK') || text.includes('SPAN') || text.includes('SEGMENT')) {
    return 'Superstructure & Launching';
  }
  if (text.includes('PIER') || text.includes('SUBSTRUCTURE') || text.includes('PORTAL') || text.includes('ABUTMENT') || text.includes('PIER CAP')) {
    return 'Piers & Substructure';
  }
  if (text.includes('PILE') || text.includes('FOUNDATION') || text.includes('CASING') || text.includes('BORED') || text.includes('FOOTING') || text.includes('RAFT')) {
    return 'Piling & Foundation';
  }
  if (text.includes('STATION') || text.includes('DEPOT') || text.includes('TERMINAL') || text.includes('BUILDING') || text.includes('PLATFORM') || text.includes('ROOF')) {
    return 'Stations & Terminals';
  }
  if (text.includes('EARTH') || text.includes('EMBANK') || text.includes('ROW') || text.includes('CLEAR') || text.includes('EXCAV') || text.includes('CUT') || text.includes('FILL') || text.includes('FORMATION')) {
    return 'Earthwork & ROW';
  }
  if (text.includes('ELEC') || text.includes('OHE') || text.includes('TRACTION') || text.includes('POWER') || text.includes('SUBSTATION') || text.includes('SIGNAL') || text.includes('TELECOM')) {
    return 'Electrical & OHE';
  }
  if (text.includes('TEST') || text.includes('COMMISSION') || text.includes('TRIAL') || text.includes('HANDOVER') || text.includes('INSPECTION') || text.includes('CERTIF')) {
    return 'Testing & Handover';
  }
  return 'General Civil';
}

// Extracts explicit chainage numbers from strings like "CH 12+500" or "KM 45.2" or "CH 0-25"
export function extractChainage(text: string): { startKm?: number; endKm?: number } | null {
  const upper = text.toUpperCase();

  // Pattern: CH 12+500 TO CH 25+000 or KM 10 TO KM 25
  const rangeMatch = upper.match(/(?:CH|KM)\s*(\d+)(?:\+(\d+))?\s*(?:TO|-)\s*(?:CH|KM)?\s*(\d+)(?:\+(\d+))?/i);
  if (rangeMatch) {
    const sMajor = parseFloat(rangeMatch[1]) || 0;
    const sMinor = rangeMatch[2] ? parseFloat(rangeMatch[2]) / 1000 : 0;
    const eMajor = parseFloat(rangeMatch[3]) || 0;
    const eMinor = rangeMatch[4] ? parseFloat(rangeMatch[4]) / 1000 : 0;
    return {
      startKm: sMajor + sMinor,
      endKm: eMajor + eMinor,
    };
  }

  // Single chainage: CH 14+500 or KM 42.5
  const singleMatch = upper.match(/(?:CH|KM)\s*(\d+)(?:\+(\d+))?/i);
  if (singleMatch) {
    const major = parseFloat(singleMatch[1]) || 0;
    const minor = singleMatch[2] ? parseFloat(singleMatch[2]) / 1000 : 0;
    const km = major + minor;
    return {
      startKm: km,
      endKm: km,
    };
  }

  return null;
}

export interface TilosModel {
  totalKm: number;
  minKm: number;
  maxKm: number;
  sections: TilosWbsSection[];
  vectors: TilosActivityVector[];
  startDate: Date;
  finishDate: Date;
  totalDays: number;
  disciplinesPresent: TilosDiscipline[];
}

export function generateTilosModel(project: ParsedProject): TilosModel {
  // 1. Identify Level 3 WBS nodes (or depth 3, with fallback to level 2 or 1 if project is shallower)
  const wbsMap = project.wbsMap;

  // Find all WBS nodes at level 3 that have activities directly or via descendants
  let level3Nodes: WbsNode[] = [];
  for (const node of wbsMap.values()) {
    if (node.level === 3) {
      level3Nodes.push(node);
    }
  }

  // Fallback to level 2 if no level 3 nodes exist
  if (level3Nodes.length === 0) {
    for (const node of wbsMap.values()) {
      if (node.level === 2) {
        level3Nodes.push(node);
      }
    }
  }

  // Fallback to level 1 or root if still empty
  if (level3Nodes.length === 0) {
    level3Nodes = project.wbsHierarchy;
  }

  // Sort nodes in project sequence
  level3Nodes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  // Map each WBS ID to its Level 3 ancestor
  const actToLevel3Map = new Map<string, WbsNode>();

  for (const act of project.activities) {
    let curr = wbsMap.get(act.wbsId);
    let matchedL3: WbsNode | undefined;

    while (curr) {
      if (curr.level === 3 || (level3Nodes.length > 0 && curr.id === level3Nodes.find((n) => n.id === curr!.id)?.id)) {
        matchedL3 = curr;
        break;
      }
      if (!curr.parentWbsId) break;
      curr = wbsMap.get(curr.parentWbsId);
    }

    if (!matchedL3 && level3Nodes.length > 0) {
      matchedL3 = level3Nodes[0];
    }

    if (matchedL3) {
      actToLevel3Map.set(act.id, matchedL3);
    }
  }

  // Filter only level3 nodes that actually have activities assigned
  const activeLevel3Nodes = level3Nodes.filter((l3) =>
    project.activities.some((a) => actToLevel3Map.get(a.id)?.id === l3.id)
  );

  const sectionsToUse = activeLevel3Nodes.length > 0 ? activeLevel3Nodes : level3Nodes;

  // 2. Determine chainage distribution for Level 3 sections
  // Check if sections have explicit chainage in their names or codes
  let assignedKm = 0;
  const sectionChainages: TilosWbsSection[] = [];
  const palette = [
    '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4',
    '#6366F1', '#14B8A6', '#F97316', '#84CC16', '#A855F7', '#0EA5E9',
  ];

  const defaultTotalKm = Math.max(50, sectionsToUse.length * 15); // e.g. 15 km per package on average
  const kmPerSection = defaultTotalKm / Math.max(1, sectionsToUse.length);

  sectionsToUse.forEach((node, idx) => {
    const extracted = extractChainage(`${node.code} ${node.name}`);
    let sKm = assignedKm;
    let eKm = assignedKm + kmPerSection;

    if (extracted && extracted.startKm !== undefined && extracted.endKm !== undefined && extracted.endKm > extracted.startKm) {
      sKm = extracted.startKm;
      eKm = extracted.endKm;
      assignedKm = eKm;
    } else {
      assignedKm = eKm;
    }

    sectionChainages.push({
      wbsId: node.id,
      wbsCode: node.code,
      wbsName: node.name,
      level: node.level,
      startKm: Math.round(sKm * 10) / 10,
      endKm: Math.round(eKm * 10) / 10,
      activityCount: project.activities.filter((a) => actToLevel3Map.get(a.id)?.id === node.id).length,
      color: palette[idx % palette.length],
    });
  });

  const minKm = sectionChainages.length > 0 ? Math.min(...sectionChainages.map((s) => s.startKm)) : 0;
  const maxKm = sectionChainages.length > 0 ? Math.max(...sectionChainages.map((s) => s.endKm)) : 100;
  const totalKm = Math.max(10, maxKm - minKm);

  const sectionMap = new Map<string, TilosWbsSection>();
  sectionChainages.forEach((s) => sectionMap.set(s.wbsId, s));

  // 3. Project timeline boundary
  let pMinDate = project.metadata.planStartDate || '2024-01-01';
  let pMaxDate = project.metadata.planFinishDate || '2025-12-31';

  for (const act of project.activities) {
    if (act.startDate && act.startDate < pMinDate) pMinDate = act.startDate;
    if (act.finishDate && act.finishDate > pMaxDate) pMaxDate = act.finishDate;
  }

  const startDateObj = new Date(pMinDate);
  // Normalize to 1st of start month
  startDateObj.setDate(1);
  const finishDateObj = new Date(pMaxDate);
  // Normalize to end of finish month + buffer
  finishDateObj.setMonth(finishDateObj.getMonth() + 1);
  finishDateObj.setDate(1);

  const totalDays = Math.max(30, Math.round((finishDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)));

  // 4. Generate linear vectors for each activity
  const vectors: TilosActivityVector[] = [];
  const disciplinesPresent = new Set<TilosDiscipline>();

  project.activities.forEach((act, actIdx) => {
    if (!act.startDate || !act.finishDate) return;

    const l3Node = actToLevel3Map.get(act.id);
    const section = l3Node ? sectionMap.get(l3Node.id) : sectionChainages[0];

    const secStart = section ? section.startKm : 0;
    const secEnd = section ? section.endKm : 20;
    const secSpan = Math.max(1, secEnd - secStart);

    // Check if activity itself specifies chainage
    const actChainage = extractChainage(`${act.code} ${act.name}`);
    let aStartKm = secStart;
    let aEndKm = secEnd;
    let isPoint = act.type === 'TT_Mile' || act.type === 'TT_FinMile' || act.origDurationDays === 0;

    if (actChainage && actChainage.startKm !== undefined) {
      aStartKm = actChainage.startKm;
      aEndKm = actChainage.endKm !== undefined && actChainage.endKm > actChainage.startKm ? actChainage.endKm : actChainage.startKm;
      if (aEndKm === aStartKm) isPoint = true;
    } else {
      // Subdivide within section based on activity discipline or hash
      const discipline = classifyDiscipline(act);
      if (discipline === 'Stations & Terminals') {
        // Position stations at a discrete point within the section
        const pointRatio = 0.5;
        aStartKm = secStart + secSpan * pointRatio;
        aEndKm = aStartKm;
        isPoint = true;
      } else {
        // Linear tasks span across section
        // Stagger slightly by offset for clear visualization
        const offsetRatio = (actIdx % 5) * 0.05;
        aStartKm = Math.min(secEnd - 1, secStart + secSpan * offsetRatio);
        aEndKm = Math.max(aStartKm + 1, secEnd - secSpan * (0.1 - offsetRatio));
      }
    }

    const discipline = classifyDiscipline(act);
    disciplinesPresent.add(discipline);

    const sDate = new Date(act.startDate);
    const fDate = new Date(act.finishDate);
    const durationDays = Math.max(1, Math.round((fDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
    const durationMonths = Math.max(0.2, durationDays / 30);
    const distanceKm = Math.abs(aEndKm - aStartKm);
    const advanceRateMetersPerMonth = distanceKm > 0 ? Math.round((distanceKm * 1000) / durationMonths) : undefined;

    vectors.push({
      activity: act,
      level3WbsId: l3Node ? l3Node.id : 'unknown',
      level3WbsCode: l3Node ? l3Node.code : 'WBS-L3',
      level3WbsName: l3Node ? l3Node.name : 'Alignment Section',
      startKm: Math.round(aStartKm * 10) / 10,
      endKm: Math.round(aEndKm * 10) / 10,
      isPoint,
      startDate: act.startDate,
      finishDate: act.finishDate,
      startTimeMs: sDate.getTime(),
      finishTimeMs: fDate.getTime(),
      durationDays,
      advanceRateMetersPerMonth,
      discipline,
      disciplineColor: DISCIPLINE_COLORS[discipline],
      isCritical: act.isCritical,
    });
  });

  return {
    totalKm,
    minKm,
    maxKm,
    sections: sectionChainages,
    vectors,
    startDate: startDateObj,
    finishDate: finishDateObj,
    totalDays,
    disciplinesPresent: Array.from(disciplinesPresent),
  };
}
