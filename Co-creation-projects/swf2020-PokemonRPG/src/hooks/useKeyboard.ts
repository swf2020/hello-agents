import { useEffect, useRef } from 'react';

export type MoveHandler = (dx: number, dy: number) => void;
export type ActionHandler = () => void;

interface KeyboardConfig {
  /** Called when a directional key is pressed (dx, dy). */
  onMove: MoveHandler;
  /** Called when the interact key (Z / Space) is pressed. */
  onInteract: ActionHandler;
  /** Called when the menu key (Enter / X / Escape) is pressed. */
  onMenu: ActionHandler;
}

/** Map of key values -> (dx, dy) for directional movement. */
const DIRECTION_KEYS: Record<string, [number, number]> = {
  ArrowUp:    [0, -1],
  ArrowDown:  [0, 1],
  ArrowLeft:  [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  W: [0, -1],
  s: [0, 1],
  S: [0, 1],
  a: [-1, 0],
  A: [-1, 0],
  d: [1, 0],
  D: [1, 0],
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribe to keyboard input for overworld movement, interaction and menus.
 *
 * Movement keys (arrow / WASD) fire `onMove`.  Holding a movement key
 * auto-repeats after an initial lock-out delay and then at a fixed interval.
 *
 * Interact: Z or Space
 * Menu: Enter, X, or Escape
 */
export function useKeyboard({
  onMove,
  onInteract,
  onMenu,
}: KeyboardConfig): void {
  // ── Refs to avoid stale callbacks ──────────────────────────────────
  const onMoveRef = useRef(onMove);
  const onInteractRef = useRef(onInteract);
  const onMenuRef = useRef(onMenu);

  onMoveRef.current = onMove;
  onInteractRef.current = onInteract;
  onMenuRef.current = onMenu;

  // ── Repeat-prevention state ────────────────────────────────────────
  const pressedRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const INITIAL_DELAY_MS = 200;
    const REPEAT_RATE_MS = 100;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const startRepeat = (key: string, dx: number, dy: number) => {
      clearTimer();
      activeKeyRef.current = key;

      // After the initial delay, start repeating at a fixed rate
      timerRef.current = setTimeout(() => {
        if (!pressedRef.current.has(key)) {
          clearTimer();
          return;
        }
        onMoveRef.current(dx, dy);

        // Set up repeated movement
        const interval = setInterval(() => {
          if (!pressedRef.current.has(key)) {
            clearInterval(interval);
            return;
          }
          onMoveRef.current(dx, dy);
        }, REPEAT_RATE_MS);

        // Store the interval id for cleanup
        (timerRef as any).__interval = interval;
      }, INITIAL_DELAY_MS);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when the user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key;

      // Direction keys
      if (key in DIRECTION_KEYS) {
        e.preventDefault();

        if (pressedRef.current.has(key)) return; // skip repeat
        pressedRef.current.add(key);

        const [dx, dy] = DIRECTION_KEYS[key];
        onMoveRef.current(dx, dy);
        startRepeat(key, dx, dy);
        return;
      }

      // Interact: Z / Space
      if (key === 'z' || key === 'Z' || key === ' ') {
        e.preventDefault();
        if (pressedRef.current.has(key)) return;
        pressedRef.current.add(key);
        onInteractRef.current();
        return;
      }

      // Menu: Enter / X / Escape
      if (key === 'Enter' || key === 'x' || key === 'X' || key === 'Escape') {
        e.preventDefault();
        if (pressedRef.current.has(key)) return;
        pressedRef.current.add(key);
        onMenuRef.current();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key;
      pressedRef.current.delete(key);

      if (activeKeyRef.current === key) {
        activeKeyRef.current = null;
        clearTimer();

        // Clear any running interval
        if ((timerRef as any).__interval !== undefined) {
          clearInterval((timerRef as any).__interval);
          (timerRef as any).__interval = undefined;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearTimer();
    };
  }, []); // empty deps — refs keep callbacks fresh
}
