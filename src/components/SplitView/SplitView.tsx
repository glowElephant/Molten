import { useRef, useCallback, useState } from 'react';
import { TerminalPanel } from '../Terminal';
import { useSessionStore } from '../../stores/sessionStore';
import type { LayoutNode } from '../../stores/layoutStore';
import './SplitView.css';

interface SplitViewProps {
  node: LayoutNode;
}

export function SplitView({ node }: SplitViewProps) {
  if (node.type === 'terminal' && node.sessionId) {
    return <TerminalLeaf sessionId={node.sessionId} />;
  }

  if (node.type === 'split' && node.children && node.children.length === 2) {
    return (
      <SplitContainer
        direction={node.direction || 'horizontal'}
        ratio={node.ratio || 0.5}
        left={node.children[0]}
        right={node.children[1]}
      />
    );
  }

  return null;
}

function TerminalLeaf({ sessionId }: { sessionId: string }) {
  const { activeSessionId, setActiveSession } = useSessionStore();
  const isActive = sessionId === activeSessionId;

  return (
    <div
      className={`split-leaf ${isActive ? 'split-leaf--active' : ''}`}
      onClick={() => setActiveSession(sessionId)}
    >
      <TerminalPanel sessionId={sessionId} />
    </div>
  );
}

interface SplitContainerProps {
  direction: 'horizontal' | 'vertical';
  ratio: number;
  left: LayoutNode;
  right: LayoutNode;
}

function SplitContainer({ direction, ratio: initialRatio, left, right }: SplitContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(initialRatio);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();

        let newRatio: number;
        if (direction === 'horizontal') {
          newRatio = (e.clientX - rect.left) / rect.width;
        } else {
          newRatio = (e.clientY - rect.top) / rect.height;
        }

        // Clamp between 20% and 80%
        newRatio = Math.max(0.2, Math.min(0.8, newRatio));
        setRatio(newRatio);
      };

      const onMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [direction]
  );

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      ref={containerRef}
      className={`split-container split-container--${direction}`}
    >
      <div
        className="split-pane"
        style={{
          [isHorizontal ? 'width' : 'height']: `${ratio * 100}%`,
        }}
      >
        <SplitView node={left} />
      </div>

      <div
        className={`split-divider split-divider--${direction}`}
        onMouseDown={handleMouseDown}
      />

      <div
        className="split-pane"
        style={{
          [isHorizontal ? 'width' : 'height']: `${(1 - ratio) * 100}%`,
        }}
      >
        <SplitView node={right} />
      </div>
    </div>
  );
}
