/**
 * Opens a URL in one new tab, falling back to same-tab navigation when blocked.
 */
export function openUrlInNewTab(url: string): void {
  const newWindow = window.open(url, '_blank');

  // Fallback when pop-up blockers prevent opening a new tab.
  if (!newWindow) {
    window.location.href = url;
    return;
  }

  try {
    newWindow.opener = null;
  } catch {
    // Ignore browsers that disallow writing to the returned WindowProxy.
  }
}
