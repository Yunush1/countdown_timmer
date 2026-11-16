'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MilestoneEditor from './MilestoneEditor';
import PhonePreview from './PhonePreview';
import Reminders from './Reminders';
import StylePicker from './StylePicker';
import Ticker from './Ticker';
import { countdown, deadlineAt, fmtDay, nextMilestone, parseDay, relDay, sortedMilestones } from '@/lib/dates';
import { drawLockScreen, loadCanvasFonts, overlayColor, readFontFamilies, type FontFamilies } from '@/lib/draw';
import { defaultState, SIZES, STYLES } from '@/lib/presets';
import { canvasToBlob, copyText, saveImage } from '@/lib/share';
import type { AppState, DeadlineType } from '@/lib/types';

const STORAGE_KEY = 'countdown-lockscreen-v1';

function loadState(): AppState {
  const d = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return d;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return d;
    const s: AppState = { ...d, ...saved };
    if (!STYLES[s.style]) s.style = 'midnight';
    if (!SIZES[s.size]) s.size = 'iphone';
    if (!Array.isArray(s.milestones)) s.milestones = [];
    return s;
  } catch {
    return d;
  }
}

export default function CountdownApp() {
  // This component is rendered client-side only (see ClientApp.tsx), so reading
  // localStorage and the current date in the initializer is safe.
  const [state, setState] = useState<AppState>(loadState);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState<FontFamilies | null>(null);
  const [minute, setMinute] = useState(() => Math.floor(Date.now() / 6e4));
  const [pvStatus, setPvStatus] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof AppState>(key: K, value: AppState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  }, []);

  // Save edits in this browser.
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
    }, 250);
    return () => clearTimeout(t);
  }, [state]);

  // Re-render when the minute changes (clock overlay + countdown).
  useEffect(() => {
    const id = setInterval(() => setMinute(Math.floor(Date.now() / 6e4)), 1000);
    return () => clearInterval(id);
  }, []);

  // Resolve next/font family names and wait for them before drawing text on canvas.
  useEffect(() => {
    const f = readFontFamilies();
    setFonts(f);
    loadCanvasFonts(f).then(() => setFonts({ ...f }));
  }, []);

  // Draw the wallpaper.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !fonts) return;
    const raf = requestAnimationFrame(() => drawLockScreen(cv, state, photo, fonts));
    return () => cancelAnimationFrame(raf);
  }, [state, photo, fonts, minute]);

  // Close the save sheet with Escape and free its image URL.
  useEffect(() => {
    if (!sheetUrl) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetUrl(null); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); URL.revokeObjectURL(sheetUrl); };
  }, [sheetUrl]);

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { setPhoto(img); setPhotoError(''); URL.revokeObjectURL(url); };
    img.onerror = () => { setPhotoError('That file could not be read as an image. Try a JPG or PNG.'); URL.revokeObjectURL(url); };
    img.src = url;
  };

  const clearPhoto = () => {
    setPhoto(null);
    if (photoInput.current) photoInput.current.value = '';
  };

  const onSave = async () => {
    const cv = canvasRef.current;
    if (!cv || !fonts) return;
    drawLockScreen(cv, state, photo, fonts);
    setPvStatus('Preparing image…');
    const blob = await canvasToBlob(cv);
    if (!blob) { setPvStatus('The image could not be created. Try removing the photo and saving again.'); return; }
    const slug = (state.name || 'deadline').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'deadline';
    const result = await saveImage(blob, `${slug}-countdown-${SIZES[state.size].label.toLowerCase()}.png`);
    if (result === 'shared') setPvStatus('Choose “Save Image”, then set it as your lock screen.');
    else if (result === 'downloaded') setPvStatus('Downloaded. Set it as your lock screen wallpaper.');
    else if (result === 'cancelled') setPvStatus('Save cancelled.');
    else { setPvStatus(''); setSheetUrl(URL.createObjectURL(blob)); }
  };

  const onShare = async () => {
    const cd = countdown(state);
    const dl = deadlineAt(state);
    const nx = nextMilestone(sortedMilestones(state.milestones));
    const name = state.name.trim() || 'my deadline';
    let t = cd.passed ? `${name} is here.` : `${cd.num} ${cd.unit} until ${name}${dl ? ` (${fmtDay(dl)})` : ''}.`;
    if (nx && !cd.passed) {
      const d = parseDay(nx.date);
      t += ` Next up: ${nx.text.trim()}${d ? `, ${relDay(d)}` : ''}.`;
    }
    if (state.motto.trim()) t += ` ${state.motto.trim()}`;
    const ok = await copyText(t);
    setPvStatus(ok ? 'Share message copied.' : 'Copying is blocked here. Select the text manually instead.');
  };

  const st = STYLES[state.style];
  const accentValue = state.accent || (photo ? st.photoAccent : st.accent);

  return (
    <div className="wrap">
      <header className="top">
        <div className="top-text">
          <p className="eyebrow">Your deadline, your design</p>
          <h1>Countdown Lock Screen</h1>
          <p className="lede">
            Map out the milestones before your deadline, pick a look, and save a phone wallpaper that shows how many days are left.
          </p>
        </div>
        <Ticker name={state.name} deadline={deadlineAt(state)} />
      </header>

      <div className="grid">
        <div className="steps">
          {/* I */}
          <section className="step" aria-labelledby="s1">
            <div className="step-head"><span className="num">I.</span><h2 id="s1">Map out your milestones</h2></div>
            <p className="hint">The fields start with an example (a final exam about three weeks out). Replace them with your own deadline.</p>
            <div className="fields">
              <div className="field wide">
                <label className="lb" htmlFor="dlName">What&apos;s the deadline?</label>
                <input className="in" id="dlName" maxLength={70} placeholder="Final exam, client launch, holiday party…"
                  value={state.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="field">
                <label className="lb" htmlFor="dlType">Kind of deadline</label>
                <select className="in" id="dlType" value={state.type} onChange={(e) => set('type', e.target.value as DeadlineType)}>
                  <option value="exam">Exam</option>
                  <option value="project">Client deliverable</option>
                  <option value="event">Event or party</option>
                  <option value="other">Something else</option>
                </select>
              </div>
              <div className="field">
                <label className="lb" htmlFor="dlDate">Due date</label>
                <input className="in" id="dlDate" type="date" value={state.date} onChange={(e) => set('date', e.target.value)} />
              </div>
              <div className="field">
                <label className="lb" htmlFor="dlTime">Due time</label>
                <input className="in" id="dlTime" type="time" value={state.time} onChange={(e) => set('time', e.target.value)} />
              </div>
              <div className="field">
                <label className="lb" htmlFor="dlStart">Counting from</label>
                <input className="in" id="dlStart" type="date" value={state.start} onChange={(e) => set('start', e.target.value)} />
              </div>
            </div>
            <MilestoneEditor state={state} onChange={(ms) => set('milestones', ms)} />
          </section>

          {/* II */}
          <section className="step" aria-labelledby="s2">
            <div className="step-head"><span className="num">II.</span><h2 id="s2">Design your lock screen</h2></div>
            <StylePicker value={state.style} onChange={(s) => set('style', s)} />
            <div className="fields">
              <div className="field">
                <label className="lb" htmlFor="accent">Accent color</label>
                <div className="color-row">
                  <input type="color" id="accent" value={accentValue} onChange={(e) => set('accent', e.target.value)} />
                  <button className="btn small" type="button" onClick={() => set('accent', null)}>Use style default</button>
                </div>
              </div>
              <div className="field">
                <label className="lb" htmlFor="photo">Reference photo as background</label>
                <input ref={photoInput} className="file-in" type="file" id="photo" accept="image/*"
                  onChange={(e) => onPhoto(e.target.files?.[0])} />
                {photo && <button className="btn small" type="button" onClick={clearPhoto}>Remove photo</button>}
                {photoError && <p className="status">{photoError}</p>}
              </div>
              <div className="field wide">
                <label className="lb" htmlFor="motto">A line to keep you going (optional)</label>
                <input className="in" id="motto" maxLength={60} placeholder="One chapter a day."
                  value={state.motto} onChange={(e) => set('motto', e.target.value)} />
              </div>
            </div>
            <div className="toggles">
              <label className="tg"><input type="checkbox" id="showMs" checked={state.showMs} onChange={(e) => set('showMs', e.target.checked)} /> Show milestones</label>
              <label className="tg"><input type="checkbox" id="showProg" checked={state.showProg} onChange={(e) => set('showProg', e.target.checked)} /> Show progress bar</label>
            </div>
          </section>

          {/* III */}
          <section className="step" aria-labelledby="s3">
            <div className="step-head">
              <span className="num">III.</span><h2 id="s3">Keep yourself on track</h2><span className="opt">Optional</span>
            </div>
            <p className="hint">
              A wallpaper doesn&apos;t update itself, so set a daily reminder to save a fresh one. Copy this plan into your phone&apos;s reminders or calendar app.
            </p>
            <div className="fields">
              <div className="field">
                <label className="lb" htmlFor="remTime">Daily reminder time</label>
                <input className="in" id="remTime" type="time" value={state.remTime} onChange={(e) => set('remTime', e.target.value)} />
              </div>
              <div className="field field-end">
                <label className="tg tg-tall">
                  <input type="checkbox" id="remBefore" checked={state.remBefore} onChange={(e) => set('remBefore', e.target.checked)} />
                  Also remind me the day before each milestone
                </label>
              </div>
            </div>
            <Reminders state={state} />
          </section>
        </div>

        <PhonePreview
          canvasRef={canvasRef}
          size={state.size}
          onSize={(s) => set('size', s)}
          clockColor={overlayColor(state, !!photo)}
          now={new Date(minute * 6e4)}
          status={pvStatus}
          onSave={onSave}
          onShare={onShare}
        />
      </div>

      {sheetUrl && (
        <div className="sheet" onClick={(e) => { if (e.target === e.currentTarget) setSheetUrl(null); }}>
          <div className="sheet-card" role="dialog" aria-modal="true" aria-label="Save your wallpaper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sheetUrl} alt="Your countdown wallpaper" />
            <p>Press and hold the image (or right-click it) and choose <b>Save image</b>.</p>
            <button className="btn" type="button" autoFocus onClick={() => setSheetUrl(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
