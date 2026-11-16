'use client';

import { useEffect, useState } from 'react';
import { pad2 } from '@/lib/dates';

export default function Ticker({ name, deadline }: { name: string; deadline: Date | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!deadline) {
    return (
      <div className="ticker">
        <span className="tk-label">No due date set</span>
        <span className="tk">--</span>
      </div>
    );
  }

  let ms = Math.max(0, deadline.getTime() - now);
  const d = Math.floor(ms / 864e5); ms -= d * 864e5;
  const h = Math.floor(ms / 36e5); ms -= h * 36e5;
  const m = Math.floor(ms / 6e4);
  const s = Math.floor((ms - m * 6e4) / 1e3);

  return (
    <div className="ticker">
      <span className="tk-label">Until {name.trim() || 'your deadline'}</span>
      <span className="tk">
        <b>{d}</b>d {pad2(h)}h {pad2(m)}m {pad2(s)}s
      </span>
    </div>
  );
}
