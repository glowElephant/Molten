import { useEffect, useRef, useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useMessageBusStore } from '../../stores/messageBusStore';
import { detectStatus } from '../../utils/statusDetector';
import { eventBus } from '../../utils/eventBus';
import {
  getTerminal,
  createTerminal,
  attachTerminal,
  detachTerminal,
  isWired,
  markWired,
} from '../../utils/terminalManager';
import '@xterm/xterm/css/xterm.css';
import './TerminalPanel.css';

interface TerminalPanelProps {
  sessionId: string;
}

export function TerminalPanel({ sessionId }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettingsStore();

  const handleResize = useCallback(() => {
    const entry = getTerminal(sessionId);
    if (!entry) return;

    try {
      const { terminal, fitAddon } = entry;
      const viewport = terminal.element?.querySelector('.xterm-viewport');
      const scrollTop = viewport?.scrollTop ?? 0;
      const wasAtBottom = viewport
        ? viewport.scrollTop >= viewport.scrollHeight - viewport.clientHeight - 5
        : true;

      const oldCols = terminal.cols;
      const oldRows = terminal.rows;
      fitAddon.fit();

      if (terminal.cols !== oldCols || terminal.rows !== oldRows) {
        invoke('pty_resize', {
          sessionId,
          cols: terminal.cols,
          rows: terminal.rows,
        }).catch(console.error);
      }

      if (viewport && !wasAtBottom) {
        viewport.scrollTop = scrollTop;
      }
    } catch {
      // Ignore fit errors
    }
  }, [sessionId]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Get or create the terminal instance
    const entry = getTerminal(sessionId) ?? createTerminal(sessionId, {
      fontFamily: settings.font.family,
      fontSize: settings.font.size,
      lineHeight: settings.font.lineHeight,
      cursorBlink: settings.terminal.cursorBlink,
      cursorStyle: settings.terminal.cursorStyle,
      scrollback: settings.terminal.scrollback,
    });

    const { terminal } = entry;

    // Attach (reparent) the terminal's DOM into this container
    attachTerminal(sessionId, containerRef.current);

    // Wire up PTY listeners only once per session (not per mount)
    if (!isWired(sessionId)) {
      markWired(sessionId);

      // Send user input to PTY
      terminal.onData((data) => {
        invoke('pty_write', { sessionId, data }).catch(console.error);
        eventBus.emit('session:input', { sessionId, data });
        if (data.includes('\r') || data.includes('\n')) {
          useMessageBusStore.getState().clearOutputBuffer(sessionId);
        }
      });

      // Listen for PTY output — throttle status updates
      let lastStatusUpdate = 0;
      let lastStatus: string | null = null;
      const STATUS_THROTTLE_MS = 2000;

      listen<string>(`pty-output-${sessionId}`, (event) => {
        const decoded = base64Decode(event.payload);
        terminal.write(decoded);

        const text = new TextDecoder().decode(decoded);
        const session = useSessionStore.getState().getSession(sessionId);
        const status = detectStatus(text, session?.agentType || null);

        if (status && status !== lastStatus) {
          const now = Date.now();
          if (now - lastStatusUpdate > STATUS_THROTTLE_MS) {
            lastStatus = status;
            lastStatusUpdate = now;
            useSessionStore.getState().updateStatus(sessionId, status);
          }
        }

        eventBus.emit('session:output', { sessionId, data: text });
        useMessageBusStore.getState().recordOutput(sessionId, text);
      });

      // Subscribe: receive piped input from another session
      eventBus.on('session:pipe-in', ({ toSessionId, content }) => {
        if (toSessionId !== sessionId) return;
        invoke('pty_write', { sessionId, data: content }).catch(console.error);
      });

      // Subscribe: receive broadcast
      eventBus.on('session:broadcast', ({ content, fromSessionId }) => {
        if (fromSessionId === sessionId) return;
        invoke('pty_write', { sessionId, data: content }).catch(console.error);
      });

      // Listen for PTY exit
      listen(`pty-exit-${sessionId}`, () => {
        terminal.writeln('\r\n\x1b[90m[Process exited]\x1b[0m');
        useSessionStore.getState().updateStatus(sessionId, 'idle');
      });

      // Spawn PTY process (only if not already running)
      invoke('pty_has_session', { sessionId }).then((exists) => {
        if (exists) return;
        return invoke('pty_spawn', {
          sessionId,
          config: {
            shell: settings.terminal.defaultShell || null,
            cwd: useSessionStore.getState().getSession(sessionId)?.metadata?.workingDir
              || settings.terminal.defaultCwd || null,
            env: null,
            cols: terminal.cols,
            rows: terminal.rows,
          },
        });
      }).catch((err) => {
        terminal.writeln(`\x1b[31mFailed to start terminal: ${err}\x1b[0m`);
        useSessionStore.getState().updateStatus(sessionId, 'error');
      });
    }

    // Resize observer — debounced
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastWidth = 0;
    let lastHeight = 0;
    const resizeObserver = new ResizeObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      const { width, height } = e.contentRect;
      if (Math.abs(width - lastWidth) < 2 && Math.abs(height - lastHeight) < 2) return;
      lastWidth = width;
      lastHeight = height;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => handleResize(), 100);
    });
    resizeObserver.observe(containerRef.current);

    // Delayed re-fit after layout settles (use handleResize to also notify PTY)
    setTimeout(() => handleResize(), 100);
    setTimeout(() => handleResize(), 500);
    setTimeout(() => handleResize(), 1500);

    // Cleanup — detach DOM but do NOT dispose terminal
    return () => {
      resizeObserver.disconnect();
      detachTerminal(sessionId);
    };
  }, [sessionId]); // Only re-run on session change

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
                const entry = getTerminal(sessionId);
                entry?.terminal.focus();
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
