'use client';

import { FONT_VARS, STYLES } from '@/lib/presets';
import type { StyleKey } from '@/lib/types';

export default function StylePicker({ value, onChange }: { value: StyleKey; onChange: (s: StyleKey) => void }) {
  return (
    <div className="field">
      <span className="lb" id="styleLb">Style</span>
      <div className="styles" role="radiogroup" aria-labelledby="styleLb">
        {(Object.keys(STYLES) as StyleKey[]).map((k) => {
          const st = STYLES[k];
          return (
            <label className="sw" key={k}>
              <input
                type="radio"
                name="style"
                id={`style-${k}`}
                value={k}
                checked={value === k}
                onChange={() => onChange(k)}
              />
              <span className="sw-thumb" style={{ background: st.thumb }}>
                <span style={{ color: st.thumbFg, fontFamily: FONT_VARS[st.display], fontWeight: st.numW }}>23</span>
              </span>
              <span className="sw-name">{st.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
