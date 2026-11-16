'use client';

import type { RefObject } from 'react';
import { SIZES } from '@/lib/presets';
import type { SizeKey } from '@/lib/types';

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  size: SizeKey;
  onSize: (s: SizeKey) => void;
  clockColor: string;
  now: Date;
  status: string;
  onSave: () => void;
  onShare: () => void;
}

export default function PhonePreview({ canvasRef, size, onSize, clockColor, now, status, onSave, onShare }: Props) {
  const { w, h } = SIZES[size];
  return (
    <aside className="preview" aria-label="Lock screen preview">
      <div className="sizes" role="group" aria-label="Phone size">
        {(Object.keys(SIZES) as SizeKey[]).map((k) => (
          <button key={k} className="chip" type="button" aria-pressed={size === k} onClick={() => onSize(k)}>
            {SIZES[k].label}
          </button>
        ))}
      </div>

      <div className="phone">
        <div className="screen">
          <canvas ref={canvasRef} width={w} height={h} role="img" aria-label="Lock screen wallpaper preview" />
          <div className="island" aria-hidden="true" />
          <div className="lk" aria-hidden="true" style={{ color: clockColor, top: size === 'iphone' ? '7.5%' : '6%' }}>
            <div className="lk-date">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <div className="lk-time">
              {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '')}
            </div>
          </div>
        </div>
      </div>
      <p className="cap">Your phone draws the clock; it&apos;s shown here for placement only.</p>

      <div className="pv-actions">
        <button className="btn primary" type="button" onClick={onSave}>Save wallpaper (PNG)</button>
        <button className="btn" type="button" onClick={onShare}>Copy share message</button>
        <p className="status" role="status">{status}</p>
      </div>
    </aside>
  );
}
