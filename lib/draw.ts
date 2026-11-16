import { countdown, dayDiff, deadlineAt, fmtDay, fmtShort, fmtTime, nextMilestone, parseDay, relDay, sortedMilestones } from './dates';
import { SIZES, STYLES } from './presets';
import type { AppState, FontRole } from './types';

export type FontFamilies = Record<FontRole, string>;

/**
 * next/font gives each family a generated name and exposes it through a CSS
 * variable on <html>. Canvas can't read CSS variables, so resolve them here.
 */
export function readFontFamilies(): FontFamilies {
  const cs = getComputedStyle(document.documentElement);
  const get = (v: string, fallback: string) => {
    const val = cs.getPropertyValue(v).trim();
    return val ? `${val}, ${fallback}` : fallback;
  };
  return {
    bric: get('--font-bricolage', '"Segoe UI", system-ui, sans-serif'),
    inter: get('--font-inter', 'system-ui, sans-serif'),
    serif: get('--font-instrument', 'Georgia, serif'),
    mono: get('--font-jetbrains', 'ui-monospace, Consolas, monospace'),
  };
}

/** Wait until every face the wallpaper uses is ready to draw. */
export async function loadCanvasFonts(f: FontFamilies) {
  if (!document.fonts?.load) return;
  const faces = [
    `500 80px ${f.bric}`, `600 80px ${f.bric}`, `700 80px ${f.bric}`, `800 80px ${f.bric}`,
    `400 40px ${f.inter}`, `500 40px ${f.inter}`, `600 40px ${f.inter}`,
    `400 80px ${f.serif}`,
    `400 40px ${f.mono}`, `500 40px ${f.mono}`, `700 40px ${f.mono}`,
  ];
  await Promise.all(faces.map((face) => document.fonts.load(face).catch(() => null)));
  await document.fonts.ready.catch(() => null);
}

export function drawLockScreen(cv: HTMLCanvasElement, state: AppState, photo: HTMLImageElement | null, fonts: FontFamilies) {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const { w: W, h: H } = SIZES[state.size];
  if (cv.width !== W) cv.width = W;
  if (cv.height !== H) cv.height = H;

  const s = W / 1080;
  const st = STYLES[state.style];
  const display = fonts[st.display];
  const body = fonts[st.body];
  const mono = fonts.mono;
  const isSerif = st.display === 'serif';

  const fg = photo ? '#FFFFFF' : st.fg;
  const muted = photo ? 'rgba(255,255,255,.76)' : st.muted;
  const trk = photo ? 'rgba(255,255,255,.26)' : st.track;
  const acc = state.accent || (photo ? st.photoAccent : st.accent);
  const base = photo ? '#111111' : st.base;

  const setFont = (w: number, px: number, fam: string) => { ctx.font = `${w} ${Math.round(px)}px ${fam}`; };
  const spacing = (px: number) => { if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`; };
  const measure = (t: string) => ctx.measureText(t).width;
  const ellipsize = (t: string, maxW: number) => {
    if (measure(t) <= maxW) return t;
    while (t.length && measure(t + '…') > maxW) t = t.slice(0, -1);
    return t.trimEnd() + '…';
  };
  const wrap = (text: string, maxW: number, maxLines: number) => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (measure(t) > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      const keep = lines.slice(0, maxLines);
      keep[maxLines - 1] = ellipsize(`${keep[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, maxW);
      return keep;
    }
    return lines.map((l) => ellipsize(l, maxW));
  };
  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  const circle = (x: number, y: number, r: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); };

  ctx.save();
  spacing(0);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.clearRect(0, 0, W, H);

  /* background */
  if (photo) {
    const ir = photo.naturalWidth / photo.naturalHeight, cr = W / H;
    let sw: number, sh: number, sx: number, sy: number;
    if (ir > cr) { sh = photo.naturalHeight; sw = sh * cr; sx = (photo.naturalWidth - sw) / 2; sy = 0; }
    else { sw = photo.naturalWidth; sh = sw / cr; sx = 0; sy = (photo.naturalHeight - sh) / 2; }
    ctx.drawImage(photo, sx, sy, sw, sh, 0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,.2)'); g.addColorStop(0.3, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,.72)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else {
    st.bg(ctx, W, H, s, acc);
  }

  const P = 96 * s;
  const inner = W - 2 * P;
  const cd = countdown(state);
  const dl = deadlineAt(state);
  // Top ~28% stays clear for the phone's own clock.
  let y = H * 0.29;

  /* eyebrow */
  setFont(600, 30 * s, body); spacing(6 * s); ctx.fillStyle = acc;
  ctx.fillText(cd.passed ? 'DEADLINE REACHED' : 'COUNTING DOWN TO', P, y);
  spacing(0);

  /* title */
  setFont(st.titleW, (isSerif ? 92 : 76) * s, display); ctx.fillStyle = fg;
  const lh = (isSerif ? 96 : 86) * s;
  y += 18 * s;
  for (const l of wrap(state.name.trim() || 'Your deadline', inner, 2)) { y += lh; ctx.fillText(l, P, y); }

  /* big number + unit */
  let numPx = 360 * s;
  const gap = 26 * s;
  setFont(500, 68 * s, display); const unitW = measure(cd.unit);
  setFont(st.numW, numPx, display); let nw = measure(cd.num);
  if (nw + gap + unitW > inner) { numPx *= (inner - gap - unitW) / nw; setFont(st.numW, numPx, display); nw = measure(cd.num); }
  y += numPx * 0.86;
  const nx = P - numPx * 0.03;
  ctx.fillStyle = fg; ctx.fillText(cd.num, nx, y);
  setFont(500, 68 * s, display); ctx.fillStyle = acc; ctx.fillText(cd.unit, nx + nw + gap, y);

  /* due line */
  y += 76 * s; setFont(400, 37 * s, body); ctx.fillStyle = muted;
  ctx.fillText(dl ? `Due ${fmtDay(dl)} · ${fmtTime(dl)}` : 'Pick a due date', P, y);

  /* progress */
  const start = parseDay(state.start);
  if (state.showProg && dl && start && dl > start) {
    const now = new Date();
    const frac = Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / (dl.getTime() - start.getTime())));
    y += 70 * s;
    const bh = 14 * s;
    ctx.fillStyle = trk; roundRect(P, y, inner, bh, bh / 2); ctx.fill();
    if (frac > 0) { ctx.fillStyle = acc; roundRect(P, y, Math.max(bh, inner * frac), bh, bh / 2); ctx.fill(); }
    y += bh + 46 * s;
    setFont(500, 30 * s, body); ctx.fillStyle = fg;
    ctx.fillText(`${Math.round(frac * 100)}% of the way there`, P, y);
    const total = Math.max(1, dayDiff(start, dl));
    const elapsed = Math.min(total, Math.max(0, dayDiff(start, now) + 1));
    ctx.textAlign = 'right'; ctx.fillStyle = muted; setFont(400, 30 * s, mono);
    ctx.fillText(`Day ${elapsed} of ${total}`, W - P, y);
    ctx.textAlign = 'left';
  }

  /* milestones */
  const list = sortedMilestones(state.milestones);
  const motto = state.motto.trim();
  const limit = H * 0.855 - (motto ? 150 * s : 0);
  if (state.showMs && list.length) {
    y += 96 * s;
    setFont(600, 27 * s, body); spacing(5 * s); ctx.fillStyle = muted; ctx.fillText('MILESTONES', P, y); spacing(0);

    const next = nextMilestone(list);
    const ni = next ? list.indexOf(next) : list.length - 1;
    const rowH = 74 * s;
    const maxRows = Math.max(0, Math.min(5, Math.floor((limit - y) / rowH)));
    // Keep the next milestone in view, with one finished one above it for context.
    const from = Math.max(0, Math.min(ni - 1, list.length - maxRows));
    const rows = list.slice(from, from + maxRows);
    const r = 15 * s;

    for (const m of rows) {
      y += rowH;
      const isNext = m === next;
      const d = parseDay(m.date);
      const cy = y - 13 * s, cx = P + r;

      if (m.done) {
        ctx.fillStyle = acc; circle(cx, cy, r); ctx.fill();
        ctx.strokeStyle = base; ctx.lineWidth = 4 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(cx - 7 * s, cy); ctx.lineTo(cx - 2 * s, cy + 5 * s); ctx.lineTo(cx + 7 * s, cy - 5 * s); ctx.stroke();
      } else if (isNext) {
        ctx.strokeStyle = acc; ctx.lineWidth = 4 * s; circle(cx, cy, r); ctx.stroke();
        ctx.fillStyle = acc; circle(cx, cy, r * 0.45); ctx.fill();
      } else {
        ctx.strokeStyle = muted; ctx.lineWidth = 3 * s; circle(cx, cy, r); ctx.stroke();
      }

      const label = d ? (isNext ? relDay(d) : fmtShort(d)) : '';
      setFont(isNext ? 700 : 400, 31 * s, mono);
      const dw = label ? measure(label) : 0;
      if (label) { ctx.textAlign = 'right'; ctx.fillStyle = isNext ? acc : muted; ctx.fillText(label, W - P, y); ctx.textAlign = 'left'; }

      const tx = P + 2 * r + 26 * s;
      const maxW = W - P - dw - 30 * s - tx;
      setFont(isNext ? 600 : 400, 39 * s, body);
      ctx.fillStyle = m.done ? muted : fg;
      const t = ellipsize(m.text.trim(), maxW);
      ctx.fillText(t, tx, y);
      if (m.done) { ctx.fillStyle = muted; ctx.fillRect(tx, y - 13 * s, measure(t), 2.5 * s); }
    }

    if (list.length > rows.length && y + 52 * s < H * 0.86) {
      y += 52 * s;
      setFont(400, 28 * s, body); ctx.fillStyle = muted;
      ctx.fillText(`+${list.length - rows.length} more`, P + 2 * r + 26 * s, y);
    }
  }

  /* motto */
  if (motto) {
    y = Math.min(y + 110 * s, H * 0.875);
    setFont(isSerif ? 400 : 600, (isSerif ? 54 : 44) * s, display); ctx.fillStyle = fg;
    ctx.fillText(ellipsize(`“${motto}”`, inner), P, y);
  }

  ctx.restore();
}

/** Text color the phone's clock overlay should use in the preview. */
export const overlayColor = (state: AppState, hasPhoto: boolean) => (hasPhoto ? '#FFFFFF' : STYLES[state.style].fg);
