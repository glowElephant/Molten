import { TerminalPanel } from '../Terminal';
import { useSessionStore } from '../../stores/sessionStore';
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
    const isHorizontal = node.direction === 'horizontal';
    const childSize = `${100 / node.children.length}%`;

    return (
      <div className={`split-container split-container--${node.direction || 'horizontal'}`}>
        {node.children.map((child, index) => (
          <div key={getNodeKey(child, index)} style={{ display: 'contents' }}>
            {index > 0 && (
              <div className={`split-divider split-divider--${node.direction || 'horizontal'}`} />
            )}
            <div
              className="split-pane"
              style={{ [isHorizontal ? 'width' : 'height']: childSize }}
            >
              <SplitView node={child} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function SplitTerminal({ sessionId }: { sessionId: string }) {
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

function getNodeKey(node: LayoutNode, index: number): string {
  if (node.type === 'terminal' && node.sessionId) return node.sessionId;
  return `split-${index}`;
}

/**
 * Collect all session IDs from a layout tree.
 */
export function collectSessionIds(node: LayoutNode | null): string[] {
  if (!node) return [];
  if (node.type === 'terminal' && node.sessionId) return [node.sessionId];
  if (node.type === 'split' && node.children) {
    return node.children.flatMap(collectSessionIds);
  }
  return [];
}
