import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useMessageBusStore } from '../../stores/messageBusStore';
import { detectStatus } from '../../utils/statusDetector';
import { eventBus } from '../../utils/eventBus';
import '@xterm/xterm/css/xterm.css';
import './TerminalPanel.css';

interface TerminalPanelProps {
  sessionId: string;
}

export function TerminalPanel({ sessionId }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { settings } = useSettingsStore();
  const { updateStatus, getSession } = useSessionStore();

  const handleResize = useCallback(() => {
    const fitAddon = fitAddonRef.current;
    const terminal = terminalRef.current;
    if (!fitAddon || !terminal) return;

    try {
      // Preserve scroll position across fit()
      const viewport = terminal.element?.querySelector('.xterm-viewport');
      const scrollTop = viewport?.scrollTop ?? 0;
      const wasAtBottom = viewport
        ? viewport.scrollTop >= viewport.scrollHeight - viewport.clientHeight - 5
        : true;

      const oldCols = terminal.cols;
      const oldRows = terminal.rows;
      fitAddon.fit();

      // Only notify PTY if dimensions actually changed
      if (terminal.cols !== oldCols || terminal.rows !== oldRows) {
        invoke('pty_resize', {
          sessionId,
          cols: terminal.cols,
          rows: terminal.rows,
        }).catch(console.error);
      }

      // Restore scroll position (unless user was at bottom — then stay at bottom)
      if (viewport && !wasAtBottom) {
        viewport.scrollTop = scrollTop;
      }
    } catch {
      // Ignore fit errors during unmount
    }
  }, [sessionId]);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      fontFamily: settings.font.family,
      fontSize: settings.font.size,
      lineHeight: settings.font.lineHeight,
      cursorBlink: settings.terminal.cursorBlink,
      cursorStyle: settings.terminal.cursorStyle,
      scrollback: settings.terminal.scrollback,
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

    // Let app shortcuts pass through instead of being consumed by xterm
    terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      // Don't intercept during IME composition (Korean, Japanese, Chinese input)
      if (e.isComposing || e.keyCode === 229) return true;

      if (e.ctrlKey) {
        const key = e.key.toLowerCase();
        // App shortcuts that should NOT go to terminal
        if (
          key === 'n' ||  // New session
          key === 'b' ||  // Toggle sidebar
          key === 'p' ||  // Command palette
          key === 'w' ||  // Close session
          key === 'd' ||  // Split vertical / horizontal
          key === 'i' ||  // IME input bar
          key === ',' ||  // Settings
          key === 'tab' || // Next session
          (key >= '1' && key <= '9') // Switch session by number
        ) {
          return false;
        }
        // Ctrl+Shift combos: notification panel, keybinding guide
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

    terminal.open(containerRef.current);

    // Try WebGL rendering, fallback to canvas
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      terminal.loadAddon(webglAddon);
    } catch {
      console.warn('WebGL addon not available, using canvas renderer');
    }

    fitAddon.fit();

    // Delayed re-fit to ensure correct dimensions after layout settles
    setTimeout(() => { try { fitAddon.fit(); } catch {} }, 300);
    setTimeout(() => { try { fitAddon.fit(); } catch {} }, 1000);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Send user input to PTY
    terminal.onData((data) => {
      invoke('pty_write', { sessionId, data }).catch(console.error);
      eventBus.emit('session:input', { sessionId, data });
      // Clear output buffer on Enter so "last output" only captures command result
      if (data.includes('\r') || data.includes('\n')) {
        useMessageBusStore.getState().clearOutputBuffer(sessionId);
      }
    });

    // Listen for PTY output — throttle status updates to prevent re-render cascade
    let lastStatusUpdate = 0;
    let lastStatus: string | null = null;
    const STATUS_THROTTLE_MS = 2000;

    const unlistenOutput = listen<string>(`pty-output-${sessionId}`, (event) => {
      const decoded = base64Decode(event.payload);
      terminal.write(decoded);

      const text = new TextDecoder().decode(decoded);
      const session = getSession(sessionId);
      const status = detectStatus(text, session?.agentType || null);

      // Only update status if changed AND throttle period passed
      if (status && status !== lastStatus) {
        const now = Date.now();
        if (now - lastStatusUpdate > STATUS_THROTTLE_MS) {
          lastStatus = status;
          lastStatusUpdate = now;
          updateStatus(sessionId, status);
        }
      }

      eventBus.emit('session:output', { sessionId, data: text });
      useMessageBusStore.getState().recordOutput(sessionId, text);
    });

    // Subscribe: receive piped input from another session
    const unsubPipe = eventBus.on('session:pipe-in', ({ toSessionId, content }) => {
      if (toSessionId !== sessionId) return;
      invoke('pty_write', { sessionId, data: content }).catch(console.error);
    });

    // Subscribe: receive broadcast
    const unsubBroadcast = eventBus.on('session:broadcast', ({ content, fromSessionId }) => {
      if (fromSessionId === sessionId) return; // skip self
      invoke('pty_write', { sessionId, data: content }).catch(console.error);
    });

    // Listen for PTY exit
    const unlistenExit = listen(`pty-exit-${sessionId}`, () => {
      terminal.writeln('\r\n\x1b[90m[Process exited]\x1b[0m');
      // Don't set to 'completed' — PTY exit can happen for many reasons
      // Only AI agents finishing tasks should set 'completed'
      updateStatus(sessionId, 'idle');
    });

    // Spawn PTY process (only if not already running)
    invoke('pty_has_session', { sessionId }).then((exists) => {
      if (exists) return; // PTY already running, just reconnect
      return invoke('pty_spawn', {
        sessionId,
        config: {
          shell: settings.terminal.defaultShell || null,
          cwd: getSession(sessionId)?.metadata?.workingDir || settings.terminal.defaultCwd || null,
          env: null,
          cols: terminal.cols,
          rows: terminal.rows,
        },
      });
    }).catch((err) => {
      terminal.writeln(`\x1b[31mFailed to start terminal: ${err}\x1b[0m`);
      updateStatus(sessionId, 'error');
    });

    // Resize observer — debounced to prevent scroll jumps
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastWidth = 0;
    let lastHeight = 0;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      // Only resize if dimensions actually changed (not just re-render)
      if (Math.abs(width - lastWidth) < 2 && Math.abs(height - lastHeight) < 2) return;
      lastWidth = width;
      lastHeight = height;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => handleResize(), 100);
    });
    resizeObserver.observe(containerRef.current);

    // Cleanup — only dispose terminal UI, do NOT kill PTY
    // PTY is killed when session is explicitly closed via closeSession()
    return () => {
      resizeObserver.disconnect();
      unlistenOutput.then((fn) => fn());
      unlistenExit.then((fn) => fn());
      unsubPipe();
      unsubBroadcast();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId]); // Only re-create on session change

  const [imeText, setImeText] = useState('');
  const [imeVisible, setImeVisible] = useState(false);
  const imeInputRef = useRef<HTMLTextAreaElement>(null);

  // Ctrl+I toggles IME input bar
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'i' && !e.repeat) {
        e.preventDefault();
        setImeVisible((v) => {
          if (!v) setTimeout(() => imeInputRef.current?.focus(), 50);
          return !v;
        });
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, []);

  const handleImeSend = () => {
    if (!imeText) return;
    invoke('pty_write', { sessionId, data: imeText + '\r' }).catch(console.error);
    setImeText('');
    imeInputRef.current?.focus();
  };

  return (
    <div className="terminal-panel">
      <div className="terminal-panel__container" ref={containerRef} />
      {imeVisible && (
        <div className="terminal-panel__ime-bar">
          <textarea
            ref={imeInputRef}
            className="terminal-panel__ime-input"
            value={imeText}
            onChange={(e) => setImeText(e.target.value)}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent as KeyboardEvent).isComposing) {
                e.preventDefault();
                handleImeSend();
              }
              if (e.key === 'Escape') {
                setImeVisible(false);
                terminalRef.current?.focus();
              }
            }}
            placeholder="한글 입력 (Enter 전송, Shift+Enter 개행, Esc 닫기)"
          />
          <button className="terminal-panel__ime-send" onClick={handleImeSend}>
            전송
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Decode base64 string to Uint8Array
 */
function base64Decode(encoded: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  const len = encoded.length;
  let bufLen = (len * 3) / 4;
  if (encoded[len - 1] === '=') bufLen--;
  if (encoded[len - 2] === '=') bufLen--;

  const bytes = new Uint8Array(bufLen);
  let p = 0;

  for (let i = 0; i < len; i += 4) {
    const a = lookup[encoded.charCodeAt(i)];
    const b = lookup[encoded.charCodeAt(i + 1)];
    const c = lookup[encoded.charCodeAt(i + 2)];
    const d = lookup[encoded.charCodeAt(i + 3)];

    bytes[p++] = (a << 2) | (b >> 4);
    if (encoded[i + 2] !== '=') bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (encoded[i + 3] !== '=') bytes[p++] = ((c & 3) << 6) | d;
  }

  return bytes;
}
