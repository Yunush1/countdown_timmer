'use client';

import { useEffect, useRef, useState } from 'react';
import { addDays, dayDiff, iso, nextMilestone, parseDay, sortedMilestones, today0, uid } from '@/lib/dates';
import { TEMPLATES } from '@/lib/presets';
import type { AppState, Milestone } from '@/lib/types';

interface Props {
  state: AppState;
  onChange: (milestones: Milestone[]) => void;
}

export default function MilestoneEditor({ state, onChange }: Props) {
  const { milestones } = state;
  const [status, setStatus] = useState('');
  const [undo, setUndo] = useState<Milestone[] | null>(null);
  const focusId = useRef<string | null>(null);

  const next = nextMilestone(sortedMilestones(milestones));

  useEffect(() => {
    if (focusId.current) {
      document.getElementById(`mst-${focusId.current}`)?.focus();
      focusId.current = null;
    }
  }, [milestones]);

  const patch = (id: string, change: Partial<Milestone>) =>
    onChange(milestones.map((m) => (m.id === id ? { ...m, ...change } : m)));

  const add = () => {
    const last = sortedMilestones(milestones).map((m) => parseDay(m.date)).filter((d): d is Date => !!d).pop() || today0();
    const dl = parseDay(state.date);
    let d = addDays(last, 2);
    if (dl && d >= dl) d = addDays(dl, -1);
    const m: Milestone = { id: uid(), text: '', date: iso(d), done: false };
    focusId.current = m.id;
    onChange([...milestones, m]);
    setStatus('');
  };

  const suggest = () => {
    const start = parseDay(state.start) || today0();
    const dl = parseDay(state.date);
    if (!dl || dl <= start) {
      setStatus('Set a due date after the “Counting from” date first.');
      setUndo(null);
      return;
    }
    const total = dayDiff(start, dl);
    const seen = new Set<string>();
    const out: Milestone[] = [];
    for (const [f, text] of TEMPLATES[state.type] || TEMPLATES.other) {
      const n = Math.min(Math.max(Math.round(total * f), 0), total - 1);
      const d = iso(addDays(start, n));
      if (seen.has(d) && total > 1) continue;
      seen.add(d);
      out.push({ id: uid(), text, date: d, done: false });
    }
    setUndo(milestones);
    onChange(out);
    setStatus(`Added ${out.length} checkpoints spread across ${total} days.`);
  };

  const restore = () => {
    if (!undo) return;
    onChange(undo);
    setUndo(null);
    setStatus('Restored your previous milestones.');
  };

  return (
    <>
      <div className="ms-head">
        <h3>Milestones</h3>
        <div className="row">
          <button className="btn small" type="button" onClick={suggest}>Build a schedule for me</button>
          <button className="btn small" type="button" onClick={add}>+ Add milestone</button>
        </div>
      </div>

      <ul className="ms-list">
        {milestones.length === 0 && (
          <li className="empty">
            No milestones yet. Add one, or let “Build a schedule for me” space out checkpoints between today and your due date.
          </li>
        )}
        {milestones.map((m) => (
          <li key={m.id} className={`ms-row${m.done ? ' done' : ''}${next?.id === m.id ? ' next' : ''}`}>
            <input
              type="checkbox"
              id={`msd-${m.id}`}
              aria-label="Done"
              checked={m.done}
              onChange={(e) => patch(m.id, { done: e.target.checked })}
            />
            <input
              className="in ms-text"
              id={`mst-${m.id}`}
              aria-label="Milestone"
              placeholder="Milestone"
              maxLength={60}
              value={m.text}
              onChange={(e) => patch(m.id, { text: e.target.value })}
            />
            <input
              className="in ms-date"
              type="date"
              id={`msdt-${m.id}`}
              aria-label="Milestone date"
              value={m.date}
              onChange={(e) => patch(m.id, { date: e.target.value })}
            />
            <button
              className="icon-btn"
              type="button"
              aria-label="Remove milestone"
              onClick={() => onChange(milestones.filter((x) => x.id !== m.id))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <p className="status" role="status">
        {status}{' '}
        {undo && <button type="button" onClick={restore}>Undo</button>}
      </p>
    </>
  );
}
