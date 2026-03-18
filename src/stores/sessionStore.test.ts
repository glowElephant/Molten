import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from './sessionStore';

describe('SessionStore', () => {
  beforeEach(() => {
    // Reset store state
    useSessionStore.setState({
      sessions: new Map(),
      activeSessionId: null,
    });
  });

  it('should start with empty sessions', () => {
    const { sessions, activeSessionId } = useSessionStore.getState();
    expect(sessions.size).toBe(0);
    expect(activeSessionId).toBeNull();
  });

  it('should create a session and set it as active', () => {
    const { createSession } = useSessionStore.getState();
    const id = createSession({ name: 'Test Session' });

    const { sessions, activeSessionId } = useSessionStore.getState();
    expect(sessions.size).toBe(1);
    expect(activeSessionId).toBe(id);
    expect(sessions.get(id)?.name).toBe('Test Session');
    expect(sessions.get(id)?.status).toBe('idle');
  });

  it('should create session with default name if none provided', () => {
    const { createSession } = useSessionStore.getState();
    const id = createSession();

    const { sessions } = useSessionStore.getState();
    expect(sessions.get(id)?.name).toMatch(/^Session \d+$/);
  });

  it('should close a session and update active', () => {
    const { createSession } = useSessionStore.getState();
    const id1 = createSession({ name: 'Session A' });
    const id2 = createSession({ name: 'Session B' });

    // id2 should be active (last created)
    expect(useSessionStore.getState().activeSessionId).toBe(id2);

    // Close id2, id1 should become active
    useSessionStore.getState().closeSession(id2);

    const { sessions, activeSessionId } = useSessionStore.getState();
    expect(sessions.size).toBe(1);
    expect(activeSessionId).toBe(id1);
  });

  it('should set activeSessionId to null when last session is closed', () => {
    const { createSession } = useSessionStore.getState();
    const id = createSession();

    useSessionStore.getState().closeSession(id);

    const { sessions, activeSessionId } = useSessionStore.getState();
    expect(sessions.size).toBe(0);
    expect(activeSessionId).toBeNull();
  });

  it('should update session status', () => {
    const { createSession } = useSessionStore.getState();
    const id = createSession();

    useSessionStore.getState().updateStatus(id, 'thinking');

    expect(useSessionStore.getState().sessions.get(id)?.status).toBe('thinking');
  });

  it('should not crash when updating non-existent session', () => {
    expect(() => {
      useSessionStore.getState().updateStatus('non-existent', 'error');
    }).not.toThrow();
  });

  it('should update session metadata', () => {
    const { createSession } = useSessionStore.getState();
    const id = createSession();

    useSessionStore.getState().updateMetadata(id, {
      model: 'claude-opus-4-6',
      tokensUsed: 1500,
      costUsd: 0.05,
    });

    const metadata = useSessionStore.getState().sessions.get(id)?.metadata;
    expect(metadata?.model).toBe('claude-opus-4-6');
    expect(metadata?.tokensUsed).toBe(1500);
    expect(metadata?.costUsd).toBe(0.05);
    // Unmodified fields should remain default
    expect(metadata?.gitBranch).toBeNull();
  });

  it('should rename session', () => {
    const { createSession } = useSessionStore.getState();
    const id = createSession({ name: 'Original' });

    useSessionStore.getState().renameSession(id, 'Renamed');

    expect(useSessionStore.getState().sessions.get(id)?.name).toBe('Renamed');
  });

  it('should set active session', () => {
    const { createSession } = useSessionStore.getState();
    const id1 = createSession();
    const id2 = createSession();

    useSessionStore.getState().setActiveSession(id1);
    expect(useSessionStore.getState().activeSessionId).toBe(id1);

    useSessionStore.getState().setActiveSession(id2);
    expect(useSessionStore.getState().activeSessionId).toBe(id2);
  });

  it('should return all active sessions', () => {
    const { createSession } = useSessionStore.getState();
    createSession({ name: 'A' });
    createSession({ name: 'B' });
    createSession({ name: 'C' });

    const sessions = useSessionStore.getState().getActiveSessions();
    expect(sessions).toHaveLength(3);
    expect(sessions.map((s) => s.name)).toEqual(
      expect.arrayContaining(['A', 'B', 'C'])
    );
  });
});
