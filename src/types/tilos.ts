import { Activity, WbsNode } from './xer';

export interface TilosWbsSection {
  wbsId: string;
  wbsCode: string;
  wbsName: string;
  level: number;
  startKm: number;
  endKm: number;
  activityCount: number;
  color: string;
}

export type TilosDiscipline =
  | 'Earthwork & ROW'
  | 'Piling & Foundation'
  | 'Piers & Substructure'
  | 'Superstructure & Launching'
  | 'Track Laying'
  | 'Stations & Terminals'
  | 'Electrical & OHE'
  | 'Testing & Handover'
  | 'General Civil';

export interface TilosActivityVector {
  activity: Activity;
  level3WbsId: string;
  level3WbsName: string;
  level3WbsCode: string;
  startKm: number;
  endKm: number;
  isPoint: boolean; // point activity (e.g. station) vs linear line
  startDate: string; // YYYY-MM-DD
  finishDate: string; // YYYY-MM-DD
  startTimeMs: number;
  finishTimeMs: number;
  durationDays: number;
  advanceRateMetersPerMonth?: number;
  discipline: TilosDiscipline;
  disciplineColor: string;
  isCritical: boolean;
}

export interface TilosMonthTick {
  date: Date;
  label: string; // e.g. "Jan '24"
  yearLabel?: string; // e.g. "2024"
  y: number;
  height: number;
}
