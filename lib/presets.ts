import { addDays, iso, today0, uid } from './dates';
import type { AppState, DeadlineType, FontRole, SizeKey, StyleKey } from './types';

/** Milestone templates: [fraction of the way from start to deadline, label] */
export const TEMPLATES: Record<DeadlineType, [number, string][]> = {
  exam: [
    [0.12, 'Gather notes and list every topic'],
    [0.38, 'Finish first full review'],
    [0.62, 'Timed practice exam'],
    [0.82, 'Drill your weakest topics'],
    [0.96, 'Light review, sleep early'],
  ],
  project: [
    [0.1, 'Scope and kickoff confirmed'],
    [0.4, 'First draft to client'],
    [0.6, 'Feedback round in'],
    [0.8, 'Final revisions done'],
    [0.94, 'QA and handoff prep'],
  ],
  event: [
    [0.12, 'Guest list and invites out'],
    [0.35, 'Venue and food booked'],
    [0.6, 'Decor and supplies bought'],
    [0.8, 'Confirm RSVPs'],
    [0.96, 'Prep and set up'],
  ],
  other: [
    [0.15, 'Plan the work'],
    [0.35, 'First checkpoint'],
    [0.55, 'Halfway review'],
    [0.8, 'Final push'],
    [0.95, 'Buffer day'],
  ],
};

export const SIZES: Record<SizeKey, { w: number; h: number; label: string }> = {
  iphone: { w: 1179, h: 2556, label: 'iPhone' },
  android: { w: 1080, h: 2400, label: 'Android' },
};

/** CSS variable for each font role (set by next/font in app/layout.tsx). */
export const FONT_VARS: Record<FontRole, string> = {
  bric: 'var(--font-bricolage)',
  inter: 'var(--font-inter)',
  serif: 'var(--font-instrument)',
  mono: 'var(--font-jetbrains)',
};

export function hexA(hex: string, a: number) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

type Ctx = CanvasRenderingContext2D;

export interface WallStyle {
  name: string;
  fg: string;
  muted: string;
  track: string;
  accent: string;
  /** accent used when a photo is the background */
  photoAccent: string;
  /** solid background color, used for the checkmark inside done milestones */
  base: string;
  display: FontRole;
  body: FontRole;
  titleW: number;
  numW: number;
  thumb: string;
  thumbFg: string;
  bg: (c: Ctx, W: number, H: number, s: number, acc: string) => void;
}

export const STYLES: Record<StyleKey, WallStyle> = {
  midnight: {
    name: 'Midnight', fg: '#F1F3FF', muted: 'rgba(241,243,255,.62)', track: 'rgba(255,255,255,.14)',
    accent: '#8EA6FF', photoAccent: '#B9C8FF', base: '#0A1030',
    display: 'bric', body: 'inter', titleW: 700, numW: 800,
    thumb: 'linear-gradient(180deg,#060A1C,#141D45)', thumbFg: '#F1F3FF',
    bg(c, W, H, _s, acc) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#060A1C'); g.addColorStop(0.55, '#141D45'); g.addColorStop(1, '#0A1030');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      const r = c.createRadialGradient(W * 0.9, H * 0.2, 0, W * 0.9, H * 0.2, W * 0.95);
      r.addColorStop(0, hexA(acc, 0.32)); r.addColorStop(1, hexA(acc, 0));
      c.fillStyle = r; c.fillRect(0, 0, W, H);
    },
  },
  ink: {
    name: 'Ink', fg: '#121417', muted: 'rgba(18,20,23,.55)', track: 'rgba(18,20,23,.12)',
    accent: '#2546D8', photoAccent: '#A9B9FF', base: '#F2F3F5',
    display: 'serif', body: 'inter', titleW: 400, numW: 400,
    thumb: '#F2F3F5', thumbFg: '#121417',
    bg(c, W, H, s) {
      c.fillStyle = '#F2F3F5'; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(18,20,23,.075)';
      const step = 54 * s;
      for (let y = step / 2; y < H; y += step)
        for (let x = step / 2; x < W; x += step) { c.beginPath(); c.arc(x, y, 2.2 * s, 0, Math.PI * 2); c.fill(); }
    },
  },
  blueprint: {
    name: 'Blueprint', fg: '#EAF2FF', muted: 'rgba(234,242,255,.64)', track: 'rgba(255,255,255,.16)',
    accent: '#FFD23F', photoAccent: '#FFD23F', base: '#0C3A63',
    display: 'mono', body: 'mono', titleW: 700, numW: 700,
    thumb: 'repeating-linear-gradient(0deg,rgba(255,255,255,.08) 0 1px,transparent 1px 10px),#0C3A63', thumbFg: '#FFD23F',
    bg(c, W, H, s) {
      c.fillStyle = '#0C3A63'; c.fillRect(0, 0, W, H);
      const m = 45 * s, lw = Math.max(1, s * 1.5);
      for (let i = 0, x = 0; x < W; x += m, i++) { c.fillStyle = i % 5 ? 'rgba(255,255,255,.055)' : 'rgba(255,255,255,.13)'; c.fillRect(Math.round(x), 0, lw, H); }
      for (let i = 0, y = 0; y < H; y += m, i++) { c.fillStyle = i % 5 ? 'rgba(255,255,255,.055)' : 'rgba(255,255,255,.13)'; c.fillRect(0, Math.round(y), W, lw); }
    },
  },
  sunset: {
    name: 'Dusk', fg: '#FFFFFF', muted: 'rgba(255,255,255,.76)', track: 'rgba(255,255,255,.24)',
    accent: '#FFE3A1', photoAccent: '#FFE3A1', base: '#5A2373',
    display: 'bric', body: 'inter', titleW: 700, numW: 800,
    thumb: 'linear-gradient(180deg,#FFB27A,#F2607E 50%,#4B1F6F)', thumbFg: '#FFFFFF',
    bg(c, W, H) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#FFB27A'); g.addColorStop(0.42, '#F2607E'); g.addColorStop(1, '#3E1A5E');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, 0, W, H);
    },
  },
  matcha: {
    name: 'Matcha', fg: '#1C3727', muted: 'rgba(28,55,39,.62)', track: 'rgba(28,55,39,.14)',
    accent: '#C8552F', photoAccent: '#FFB08F', base: '#DCE5D0',
    display: 'bric', body: 'inter', titleW: 700, numW: 700,
    thumb: 'radial-gradient(circle at 100% 0,rgba(200,85,47,.28),transparent 55%),#DCE5D0', thumbFg: '#1C3727',
    bg(c, W, H, _s, acc) {
      c.fillStyle = '#DCE5D0'; c.fillRect(0, 0, W, H);
      c.fillStyle = hexA(acc, 0.17); c.beginPath(); c.arc(W * 0.98, H * 0.1, W * 0.58, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(28,55,39,.07)'; c.beginPath(); c.arc(W * 0.02, H * 0.98, W * 0.62, 0, Math.PI * 2); c.fill();
    },
  },
};

/** Example data the app opens with: a final exam about three weeks out. */
export function defaultState(): AppState {
  const t = today0();
  return {
    name: 'Final exam: Organic Chemistry',
    type: 'exam',
    date: iso(addDays(t, 23)),
    time: '09:00',
    start: iso(t),
    milestones: [
      { id: uid(), text: 'Finish chapter 1–8 review', date: iso(addDays(t, 6)), done: false },
      { id: uid(), text: 'Practice exam #1', date: iso(addDays(t, 12)), done: false },
      { id: uid(), text: 'Office hours with the TA', date: iso(addDays(t, 16)), done: false },
      { id: uid(), text: 'Practice exam #2', date: iso(addDays(t, 20)), done: false },
    ],
    style: 'midnight',
    accent: null,
    motto: 'One chapter a day.',
    size: 'iphone',
    showMs: true,
    showProg: true,
    remTime: '08:00',
    remBefore: true,
  };
}
