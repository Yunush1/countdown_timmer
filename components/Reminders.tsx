'use client';

import { useState } from 'react';
import { reminderItems, reminderText } from '@/lib/reminders';
import { copyText } from '@/lib/share';
import type { AppState } from '@/lib/types';

export default function Reminders({ state }: { state: AppState }) {
  const [status, setStatus] = useState('');
  const items = reminderItems(state);

  const copy = async () => {
    const ok = await copyText(reminderText(state));
    setStatus(ok ? 'Reminder plan copied.' : 'Copying is blocked here. Select the text manually instead.');
  };

  return (
    <>
      <ol className="rem">
        {items.length === 0 ? (
          <li>
            <span className="when">—</span>
            <span>Set a due date to build a reminder plan.</span>
          </li>
        ) : (
          items.map((it, i) => (
            <li key={i} className={it.daily ? 'daily' : undefined}>
              <span className="when">{it.when}</span>
              <span>{it.text}</span>
            </li>
          ))
        )}
      </ol>
      <div className="row">
        <button className="btn small" type="button" onClick={copy}>Copy reminder plan</button>
        <span className="status" role="status">{status}</span>
      </div>
    </>
  );
}
