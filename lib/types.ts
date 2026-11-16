export type DeadlineType = 'exam' | 'project' | 'event' | 'other';
export type StyleKey = 'midnight' | 'ink' | 'blueprint' | 'sunset' | 'matcha';
export type SizeKey = 'iphone' | 'android';
export type FontRole = 'bric' | 'inter' | 'serif' | 'mono';

export interface Milestone {
  id: string;
  text: string;
  /** YYYY-MM-DD, local time */
  date: string;
  done: boolean;
}

export interface AppState {
  name: string;
  type: DeadlineType;
  date: string;
  time: string;
  start: string;
  milestones: Milestone[];
  style: StyleKey;
  accent: string | null;
  motto: string;
  size: SizeKey;
  showMs: boolean;
  showProg: boolean;
  remTime: string;
  remBefore: boolean;
}

export interface Countdown {
  num: string;
  unit: string;
  passed: boolean;
}
