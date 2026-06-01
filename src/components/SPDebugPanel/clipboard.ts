/**
 * Tiny clipboard helper. Prefers `navigator.clipboard.writeText`; falls back
 * to a hidden textarea + `document.execCommand` for older browsers. Never
 * throws to the host app — copy failures are swallowed.
 */

export async function writeToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy path
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Trigger a download for a `text/markdown`/`application/json` blob.
 * Returns `true` on success, `false` if the environment can't download or the
 * browser blocked it. Never throws — host apps must stay safe.
 */
export function downloadText(filename: string, text: string, mime: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke well after the browser has started the download. Revoking on a
    // 0ms timeout can race the download in some browsers. `unref` keeps Node
    // test runs from hanging on the pending timer.
    const timer = setTimeout(() => URL.revokeObjectURL(url), 4000);
    if (timer && typeof (timer as { unref?: () => void }).unref === 'function') {
      (timer as { unref: () => void }).unref();
    }
    return true;
  } catch {
    return false;
  }
}
