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
      <div className={`split-container split-container--${node.direction || 'horizontal'}`}>
        {node.children.map((child, index) => (
          <div key={getNodeKey(child, index)} style={{ display: 'contents' }}>
            {index > 0 && (
              <div className={`split-divider split-divider--${node.direction || 'horizontal'}`} />
            )}
            <div className="split-pane">
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
      onClick={() => setActiveSession(sessionId)}
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
