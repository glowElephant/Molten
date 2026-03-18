import { useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { TerminalPanel } from '../Terminal';
import { useSessionStore } from '../../stores/sessionStore';
import { useLayoutStore } from '../../stores/layoutStore';
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
  // Store sizes as fractions (e.g., [0.33, 0.33, 0.33] for 3 panes)
  const [sizes, setSizes] = useState<number[]>(() =>
    Array(count).fill(1 / count)
  );
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
          // Calculate cumulative size up to divider
          let cumBefore = 0;
          for (let i = 0; i <= dividerIndex; i++) cumBefore += prev[i];

          const ratio = pos / totalSize;
          const diff = ratio - cumBefore;

          // Adjust the two adjacent panes
          const minSize = 0.1; // minimum 10%
          newSizes[dividerIndex] = Math.max(minSize, prev[dividerIndex] + diff);
          newSizes[dividerIndex + 1] = Math.max(minSize, prev[dividerIndex + 1] - diff);

          // Normalize
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

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
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

function SplitTerminal({ sessionId }: { sessionId: string }) {
  const { sessions, activeSessionId, setActiveSession, closeSession } = useSessionStore();
  const session = sessions.get(sessionId);
  const isActive = sessionId === activeSessionId;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    useLayoutStore.getState().removeFromLayout(sessionId);
    closeSession(sessionId);
  };

  return (
    <div
      className={`split-leaf ${isActive ? 'split-leaf--active' : ''}`}
      onMouseDown={() => setActiveSession(sessionId)}
    >
      <div className="split-leaf__header">
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

export function collectSessionIds(node: LayoutNode | null): string[] {
  if (!node) return [];
  if (node.type === 'terminal' && node.sessionId) return [node.sessionId];
  if (node.type === 'split' && node.children) {
    return node.children.flatMap(collectSessionIds);
  }
  return [];
}
