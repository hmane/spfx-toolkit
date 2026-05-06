/**
 * Custom resize handle for the docked debug panel.
 *
 * Pointer-driven for mouse + touch; keyboard-driven via arrow keys for
 * accessibility (16px per press, 64px with Shift). Calls `onResize(px)` with
 * the new target size — the parent clamps and persists.
 */

import * as React from 'react';

export interface DebugResizeHandleProps {
  orientation: 'vertical' | 'horizontal';
  onResize: (px: number) => void;
  ariaLabel: string;
  /** Initial size in px. The handle reads this each pointer-down / key-press. */
  startSize: () => number;
}

const KEY_STEP = 16;
const KEY_STEP_LARGE = 64;

export const DebugResizeHandle: React.FC<DebugResizeHandleProps> = ({
  orientation,
  onResize,
  ariaLabel,
  startSize,
}) => {
  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const initialX = e.clientX;
      const initialY = e.clientY;
      const initialSize = startSize();

      const onMove = (ev: PointerEvent): void => {
        if (orientation === 'vertical') {
          // Right dock: dragging left increases width.
          const delta = initialX - ev.clientX;
          onResize(initialSize + delta);
        } else {
          // Bottom dock: dragging up increases height.
          const delta = initialY - ev.clientY;
          onResize(initialSize + delta);
        }
      };
      const onUp = (): void => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [orientation, onResize, startSize]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
      const current = startSize();
      let next: number | null = null;
      if (orientation === 'vertical') {
        // Right dock: ArrowLeft enlarges (handle is on the LEFT of the panel),
        // ArrowRight shrinks.
        if (e.key === 'ArrowLeft') next = current + step;
        else if (e.key === 'ArrowRight') next = current - step;
      } else {
        // Bottom dock: ArrowUp enlarges, ArrowDown shrinks.
        if (e.key === 'ArrowUp') next = current + step;
        else if (e.key === 'ArrowDown') next = current - step;
      }
      if (next !== null) {
        e.preventDefault();
        onResize(next);
      }
    },
    [orientation, onResize, startSize]
  );

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      tabIndex={0}
      className={'spdebug-resize-handle spdebug-resize-' + orientation}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    />
  );
};
