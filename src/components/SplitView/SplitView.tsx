import {} from 'react';
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

  if (node.type === 'split' && node.children && node.children.length >= 2) {
    return (
      <SplitContainer
        direction={node.direction || 'horizontal'}
        children={node.children}
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
  children: LayoutNode[];
}

function SplitContainer({ direction, children }: SplitContainerProps) {
  const isHorizontal = direction === 'horizontal';

  // Each child gets equal share
  const childSize = `${100 / children.length}%`;

  return (
    <div className={`split-container split-container--${direction}`}>
      {children.map((child, index) => (
        <div key={getNodeKey(child, index)} style={{ display: 'contents' }}>
          {index > 0 && (
            <div className={`split-divider split-divider--${direction}`} />
          )}
          <div
            className="split-pane"
            style={{
              [isHorizontal ? 'width' : 'height']: childSize,
            }}
          >
            <SplitView node={child} />
          </div>
        </div>
      ))}
    </div>
  );
}

function getNodeKey(node: LayoutNode, index: number): string {
  if (node.type === 'terminal' && node.sessionId) return node.sessionId;
  return `split-${index}`;
}
