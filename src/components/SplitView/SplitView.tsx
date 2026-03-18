import { useRef, useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { TerminalPanel } from '../Terminal';
import { useSessionStore } from '../../stores/sessionStore';
import { useLayoutStore, collectSessionIds } from '../../stores/layoutStore';
import type { LayoutNode } from '../../stores/layoutStore';
import './SplitView.css';

interface SplitViewProps {
  node: LayoutNode;
}

export function SplitView({ node }: SplitViewProps) {
  if (node.type === 'terminal' && node.sessionId) {
    return <SplitTerminal sessionId={node.sessionId} />;
  }

  if (node.type === 'split' && node.children && node.children.length >= 2) {
    return (
      <SplitContainer
        direction={node.direction || 'horizontal'}
        childNodes={node.children}
      />
    );
  }

  return null;
}

function SplitContainer({
  direction,
  childNodes,
}: {
  direction: 'horizontal' | 'vertical';
  childNodes: LayoutNode[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const count = childNodes.length;
  const [sizes, setSizes] = useState<number[]>(() =>
    Array(count).fill(1 / count)
  );
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setSizes(Array(count).fill(1 / count));
  }, [count]);
  const isHorizontal = direction === 'horizontal';

  const handleDividerMouseDown = useCallback(
    (dividerIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const totalSize = isHorizontal ? rect.width : rect.height;

      const onMouseMove = (e: MouseEvent) => {
        const pos = isHorizontal
          ? e.clientX - rect.left
          : e.clientY - rect.top;

        setSizes((prev) => {
          const newSizes = [...prev];
          let cumBefore = 0;
          for (let i = 0; i <= dividerIndex; i++) cumBefore += prev[i];

          const ratio = pos / totalSize;
          const diff = ratio - cumBefore;

          const minSize = 0.1;
          newSizes[dividerIndex] = Math.max(minSize, prev[dividerIndex] + diff);
          newSizes[dividerIndex + 1] = Math.max(minSize, prev[dividerIndex + 1] - diff);

          const total = newSizes.reduce((a, b) => a + b, 0);
          return newSizes.map((s) => s / total);
        });
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      setIsDragging(true);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', () => {
        onMouseUp();
        setIsDragging(false);
      });
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [isHorizontal]
  );

  return (
    <div
      ref={containerRef}
      className={`split-container split-container--${direction}`}
    >
      {isDragging && <div className="split-drag-overlay" />}
      {childNodes.map((child, index) => (
        <div key={getNodeKey(child, index)} style={{ display: 'contents' }}>
          {index > 0 && (
            <div
              className={`split-divider split-divider--${direction}`}
              onMouseDown={(e) => handleDividerMouseDown(index - 1, e)}
            />
          )}
          <div
            className="split-pane"
            style={{
              flex: `${sizes[index]} 1 0%`,
            }}
          >
            <SplitView node={child} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pane drag & dock system ──

type DockZone = 'top' | 'bottom' | 'left' | 'right' | 'center' | null;

/** Module-level drag state */
let splitDragSource: string | null = null;
let splitDragClone: HTMLElement | null = null;
let splitDragStartX = 0;
let splitDragStartY = 0;
let splitDragStarted = false;
let currentDropOverlay: HTMLElement | null = null;
let currentDockZone: DockZone = null;
let currentDropTargetId: string | null = null;

function getDockZone(x: number, y: number, rect: DOMRect): DockZone {
  const relX = (x - rect.left) / rect.width;
  const relY = (y - rect.top) / rect.height;

  // Edge zones: 25% from each edge
  const edge = 0.25;
  if (relY < edge) return 'top';
  if (relY > 1 - edge) return 'bottom';
  if (relX < edge) return 'left';
  if (relX > 1 - edge) return 'right';
  return 'center';
}

function showDropOverlay(paneEl: HTMLElement, zone: DockZone) {
  removeDropOverlay();
  if (!zone) return;

  const overlay = document.createElement('div');
  overlay.className = 'split-dock-overlay';

  const highlight = document.createElement('div');
  highlight.className = `split-dock-highlight split-dock-highlight--${zone}`;
  overlay.appendChild(highlight);

  paneEl.style.position = 'relative';
  paneEl.appendChild(overlay);
  currentDropOverlay = overlay;
}

function removeDropOverlay() {
  if (currentDropOverlay) {
    currentDropOverlay.remove();
    currentDropOverlay = null;
  }
}

function SplitTerminal({ sessionId }: { sessionId: string }) {
  const { sessions, activeSessionId, setActiveSession, closeSession } = useSessionStore();
  const headerRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<HTMLDivElement>(null);
  const session = sessions.get(sessionId);
  const isActive = sessionId === activeSessionId;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    useLayoutStore.getState().removeFromLayout(sessionId);
    closeSession(sessionId);
  };

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.split-leaf__close')) return;
    e.preventDefault();
    setActiveSession(sessionId);

    splitDragSource = sessionId;
    splitDragStartX = e.clientX;
    splitDragStartY = e.clientY;
    splitDragStarted = false;

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - splitDragStartX;
      const dy = ev.clientY - splitDragStartY;

      if (!splitDragStarted && Math.abs(dx) + Math.abs(dy) < 5) return;

      if (!splitDragStarted) {
        splitDragStarted = true;
        const header = headerRef.current;
        if (header) {
          splitDragClone = header.cloneNode(true) as HTMLElement;
          splitDragClone.style.position = 'fixed';
          splitDragClone.style.zIndex = '9999';
          splitDragClone.style.pointerEvents = 'none';
          splitDragClone.style.opacity = '0.85';
          splitDragClone.style.width = `${header.offsetWidth}px`;
          splitDragClone.style.background = 'var(--color-accent, #7c3aed)';
          splitDragClone.style.borderRadius = '4px';
          splitDragClone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
          document.body.appendChild(splitDragClone);
        }
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      }

      if (splitDragClone) {
        splitDragClone.style.left = `${ev.clientX - 60}px`;
        splitDragClone.style.top = `${ev.clientY - 12}px`;
      }

      // Hit-test all split-leaf elements for dock zones
      const allLeaves = document.querySelectorAll('.split-leaf');
      let foundTarget = false;

      allLeaves.forEach((leaf) => {
        const el = leaf as HTMLElement;
        const targetId = el.querySelector('.split-leaf__header')?.getAttribute('data-session-id');
        if (!targetId || targetId === splitDragSource) return;

        const rect = el.getBoundingClientRect();
        const hit = ev.clientX >= rect.left && ev.clientX <= rect.right &&
                    ev.clientY >= rect.top && ev.clientY <= rect.bottom;

        if (hit) {
          foundTarget = true;
          const zone = getDockZone(ev.clientX, ev.clientY, rect);
          if (currentDropTargetId !== targetId || currentDockZone !== zone) {
            currentDropTargetId = targetId;
            currentDockZone = zone;
            showDropOverlay(el, zone);
          }
        }
      });

      if (!foundTarget) {
        removeDropOverlay();
        currentDropTargetId = null;
        currentDockZone = null;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (splitDragClone) {
        splitDragClone.remove();
        splitDragClone = null;
      }

      removeDropOverlay();

      if (splitDragStarted && splitDragSource && currentDropTargetId && currentDockZone) {
        if (currentDockZone === 'center') {
          useLayoutStore.getState().swapSessions(splitDragSource, currentDropTargetId);
        } else {
          useLayoutStore.getState().dockSession(splitDragSource, currentDropTargetId, currentDockZone);
        }
      }

      splitDragSource = null;
      splitDragStarted = false;
      currentDropTargetId = null;
      currentDockZone = null;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sessionId, setActiveSession]);

  return (
    <div
      ref={leafRef}
      className={`split-leaf ${isActive ? 'split-leaf--active' : ''}`}
      onMouseDown={() => setActiveSession(sessionId)}
    >
      <div
        ref={headerRef}
        className="split-leaf__header"
        data-session-id={sessionId}
        onMouseDown={handleHeaderMouseDown}
      >
        <span className="split-leaf__name">
          {session?.name || 'Session'}
        </span>
        <button
          className="split-leaf__close"
          onClick={handleClose}
          title="Close session"
        >
          <X size={12} />
        </button>
      </div>
      <TerminalPanel sessionId={sessionId} />
    </div>
  );
}

function getNodeKey(node: LayoutNode, index: number): string {
  if (node.type === 'terminal' && node.sessionId) return node.sessionId;
  return `split-${index}`;
}

export { collectSessionIds };
