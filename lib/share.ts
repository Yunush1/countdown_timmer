export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export function canvasToBlob(cv: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => cv.toBlob((b) => resolve(b), 'image/png'));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export type SaveResult = 'shared' | 'downloaded' | 'cancelled' | 'fallback';

/**
 * On phones, open the share sheet so the image can go straight to Photos/Gallery.
 * On computers, download the PNG. Returns 'fallback' when neither worked, so the
 * caller can show the image for a long-press save instead.
 */
export async function saveImage(blob: Blob, filename: string): Promise<SaveResult> {
  const isTouch = window.matchMedia?.('(pointer: coarse)').matches;
  if (isTouch && typeof navigator.canShare === 'function') {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Countdown lock screen' });
        return 'shared';
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
        return 'fallback';
      }
    }
  }
  try {
    downloadBlob(blob, filename);
    return 'downloaded';
  } catch {
    return 'fallback';
  }
}
