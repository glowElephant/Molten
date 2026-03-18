import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';

export interface TerminalEntry {
  terminal: Terminal;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  /** Whether terminal.open() has been called */
  opened: boolean;
}

/** Global store of Terminal instances, keyed by sessionId. */
const terminals = new Map<string, TerminalEntry>();

/** Track which sessions have had their PTY listeners wired up */
const wiredSessions = new Set<string>();

export function getTerminal(sessionId: string): TerminalEntry | undefined {
  return terminals.get(sessionId);
}

export function hasTerminal(sessionId: string): boolean {
  return terminals.has(sessionId);
}

export function isWired(sessionId: string): boolean {
  return wiredSessions.has(sessionId);
}

export function markWired(sessionId: string): void {
  wiredSessions.add(sessionId);
}

/**
 * Create a Terminal instance (but don't open it yet).
 * open() is deferred until attachTerminal() provides a real DOM container.
 */
export function createTerminal(
  sessionId: string,
  options: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    cursorBlink: boolean;
    cursorStyle: 'block' | 'underline' | 'bar';
    scrollback: number;
  },
): TerminalEntry {
  const existing = terminals.get(sessionId);
  if (existing) return existing;

  const terminal = new Terminal({
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    lineHeight: options.lineHeight,
    cursorBlink: options.cursorBlink,
    cursorStyle: options.cursorStyle,
    scrollback: options.scrollback,
    theme: {
      background: '#0a0a0f',
      foreground: '#e2e8f0',
      cursor: '#7c3aed',
      selectionBackground: 'rgba(124, 58, 237, 0.3)',
      black: '#1e1e2e',
      red: '#f38ba8',
      green: '#a6e3a1',
      yellow: '#f9e2af',
      blue: '#89b4fa',
      magenta: '#cba6f7',
      cyan: '#94e2d5',
      white: '#cdd6f4',
      brightBlack: '#585b70',
      brightRed: '#f38ba8',
      brightGreen: '#a6e3a1',
      brightYellow: '#f9e2af',
      brightBlue: '#89b4fa',
      brightMagenta: '#cba6f7',
      brightCyan: '#94e2d5',
      brightWhite: '#a6adc8',
    },
    allowProposedApi: true,
  });

  // Custom key event handler — let app shortcuts pass through
  terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
    if (e.isComposing || e.keyCode === 229) return true;
    if (e.ctrlKey) {
      const key = e.key.toLowerCase();
      if (
        key === 'n' || key === 'b' || key === 'p' || key === 'w' ||
        key === 'd' || key === 'i' || key === ',' || key === 'tab' ||
        (key >= '1' && key <= '9')
      ) {
        return false;
      }
      if (e.shiftKey && (key === 'n' || key === '?')) {
        return false;
      }
    }
    return true;
  });

  const fitAddon = new FitAddon();
  const searchAddon = new SearchAddon();
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(searchAddon);

  // Do NOT call terminal.open() here — wait for attachTerminal()
  const entry: TerminalEntry = { terminal, fitAddon, searchAddon, opened: false };
  terminals.set(sessionId, entry);
  return entry;
}

/**
 * Attach terminal to a real DOM container.
 * On first attach, calls terminal.open() so xterm gets correct dimensions.
 * On subsequent attaches (reparent), moves the xterm DOM element.
 */
export function attachTerminal(sessionId: string, container: HTMLDivElement): boolean {
  const entry = terminals.get(sessionId);
  if (!entry) return false;

  if (!entry.opened) {
    // First time: open terminal directly into the container
    entry.terminal.open(container);
    entry.opened = true;

    // Try WebGL
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => webglAddon.dispose());
      entry.terminal.loadAddon(webglAddon);
    } catch {
      console.warn('WebGL addon not available, using canvas renderer');
    }

    entry.fitAddon.fit();
  } else {
    // Reparent: move xterm's DOM elements into the new container
    const xtermElement = entry.terminal.element;
    if (xtermElement && xtermElement.parentElement !== container) {
      container.appendChild(xtermElement);
    }
    // Do NOT call fit() here — let TerminalPanel's handleResize()
    // detect the size change and call pty_resize together
  }

  return true;
}

/**
 * Detach terminal from its current container (but keep alive).
 */
export function detachTerminal(sessionId: string): void {
  const entry = terminals.get(sessionId);
  if (!entry || !entry.opened) return;
  const xtermElement = entry.terminal.element;
  if (xtermElement?.parentElement) {
    xtermElement.parentElement.removeChild(xtermElement);
  }
}

/**
 * Permanently destroy a terminal (when session is closed).
 */
export function destroyTerminal(sessionId: string): void {
  const entry = terminals.get(sessionId);
  if (!entry) return;
  entry.terminal.dispose();
  terminals.delete(sessionId);
  wiredSessions.delete(sessionId);
}
