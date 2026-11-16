import type { AppState, Countdown, Milestone } from './types';

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const iso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export function parseDay(s?: string | null): Date | null {
  const [y, m, d] = String(s || '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const today0 = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

export const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Whole calendar days from a to b (DST-safe). */
export const dayDiff = (a: Date, b: Date) => Math.round((dayOf(b).getTime() - dayOf(a).getTime()) / 864e5);

export const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
export const fmtShort = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export const fmtTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** "08:00" -> "8:00 AM" in the viewer's locale */
export function fmtHM(t: string) {
  const [h, m] = String(t || '08:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return fmtTime(d);
}

export const uid = () => Math.random().toString(36).slice(2, 9);

export function deadlineAt(s: AppState): Date | null {
  const d = parseDay(s.date);
  if (!d) return null;
  const [h, m] = String(s.time || '09:00').split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function countdown(s: AppState): Countdown {
  const dl = deadlineAt(s);
  if (!dl) return { num: '–', unit: '', passed: false };
  const ms = dl.getTime() - Date.now();
  if (ms <= 0) return { num: '0', unit: 'days', passed: true };
  const cd = dayDiff(today0(), dl);
  if (cd >= 1) return { num: String(cd), unit: cd === 1 ? 'day' : 'days', passed: false };
  const h = Math.ceil(ms / 36e5);
  return { num: String(h), unit: h === 1 ? 'hour' : 'hours', passed: false };
}

export function sortedMilestones(ms: Milestone[]) {
  const key = (m: Milestone) => parseDay(m.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return ms.filter((m) => m.text.trim()).slice().sort((a, b) => key(a) - key(b));
}

/** First milestone that isn't done and isn't in the past. */
export function nextMilestone(list: Milestone[]) {
  const t = today0();
  return (
    list.find((m) => {
      const d = parseDay(m.date);
      return !m.done && (!d || d >= t);
    }) || null
  );
}

export function relDay(d: Date) {
  const n = dayDiff(today0(), d);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n < 0) return `${-n}d ago`;
  return `in ${n} days`;
}
