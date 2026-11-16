import { addDays, dayOf, deadlineAt, fmtHM, fmtShort, parseDay, sortedMilestones, today0 } from './dates';
import type { AppState } from './types';

export interface Reminder {
  when: string;
  text: string;
  daily?: boolean;
}

export function reminderItems(state: AppState): Reminder[] {
  const dl = deadlineAt(state);
  const at = fmtHM(state.remTime);
  const items: Reminder[] = [];
  if (!dl) return items;

  items.push({ daily: true, when: `Daily ${at}`, text: `Save a fresh lock screen and check today's goal (until ${fmtShort(dl)})` });

  if (state.remBefore) {
    for (const m of sortedMilestones(state.milestones)) {
      const d = parseDay(m.date);
      if (!d || m.done) continue;
      const before = addDays(d, -1);
      if (before < today0()) continue;
      items.push({ when: `${fmtShort(before)} · ${at}`, text: `Tomorrow: ${m.text.trim()}` });
    }
  }

  const eve = addDays(dayOf(dl), -1);
  if (eve >= today0()) items.push({ when: `${fmtShort(eve)} · ${at}`, text: `Tomorrow is the big day: ${state.name.trim() || 'your deadline'}` });
  return items;
}

export function reminderText(state: AppState) {
  return `Reminders for ${state.name.trim() || 'my deadline'}\n` + reminderItems(state).map((i) => `• ${i.when}: ${i.text}`).join('\n');
}
