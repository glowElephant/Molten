import { useSessionStore } from '../stores/sessionStore';
import { useLayoutStore } from '../stores/layoutStore';
import { useTriggerStore } from '../stores/triggerStore';
import type { WorkspaceSnapshot } from '../types';
import type { Session } from '../types';
import type { LayoutGroup } from '../stores/layoutStore';

export function takeSnapshot(): WorkspaceSnapshot {
  const { sessions, sessionOrder, activeSessionId } = useSessionStore.getState();
  const { groups } = useLayoutStore.getState();
  const { triggers } = useTriggerStore.getState();

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    activeSessionId,
    sessionOrder,
    triggers,
    sessions: Array.from(sessions.values()).map((s) => ({
      id: s.id,
      name: s.name,
      workingDir: s.metadata.workingDir,
      agentType: s.agentType,
      createdAt: s.createdAt,
    })),
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      layout: g.layout,
      collapsed: g.collapsed,
    })),
  };
}

export function restoreSnapshot(snapshot: WorkspaceSnapshot): boolean {
  if (!snapshot.version || !snapshot.sessions || snapshot.sessions.length === 0) {
    return false;
  }

  const { restoreSession, setSessionOrder } = useSessionStore.getState();

  // Restore each session (PTY spawned later when TerminalPanel mounts)
  for (const saved of snapshot.sessions) {
    const session: Session = {
      id: saved.id,
      name: saved.name,
      status: 'idle',
      agentType: saved.agentType,
      createdAt: saved.createdAt,
      metadata: {
        model: null,
        tokensUsed: 0,
        costUsd: 0,
        gitBranch: null,
        workingDir: saved.workingDir,
      },
    };
    restoreSession(session);
  }

  // Restore order and active session
  const validOrder = snapshot.sessionOrder.filter((id) =>
    snapshot.sessions.some((s) => s.id === id)
  );
  const activeId = snapshot.activeSessionId &&
    snapshot.sessions.some((s) => s.id === snapshot.activeSessionId)
    ? snapshot.activeSessionId
    : validOrder[0] || null;

  setSessionOrder(validOrder, activeId);

  // Restore layout groups
  if (snapshot.groups && snapshot.groups.length > 0) {
    useLayoutStore.getState().restoreGroups(snapshot.groups as LayoutGroup[]);
  }

  // Restore triggers
  if (snapshot.triggers && snapshot.triggers.length > 0) {
    useTriggerStore.getState().setTriggers(snapshot.triggers);
  }

  return true;
}
