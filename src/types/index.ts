// Session types
export type SessionStatus = 'thinking' | 'waiting' | 'idle' | 'error' | 'completed';

export type AgentType = 'claude_code' | 'codex' | 'gemini_cli' | 'aider' | 'opencode' | 'unknown';

export interface Session {
  id: string;
  name: string;
  status: SessionStatus;
  agentType: AgentType | null;
  createdAt: string;
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  model: string | null;
  tokensUsed: number;
  costUsd: number;
  gitBranch: string | null;
  workingDir: string;
}

export interface SessionConfig {
  name?: string;
  shell?: string;
  cwd?: string;
  env?: Record<string, string>;
}

// Notification types
export interface MoltenNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  sessionId?: string;
  timestamp: string;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

// Workspace types
export interface WorkspacePreset {
  name: string;
  description: string;
  layout: unknown; // rc-dock LayoutData
  createdAt: string;
}

// Settings types
export interface MoltenSettings {
  theme: string;
  font: FontConfig;
  terminal: TerminalConfig;
  notifications: NotificationConfig;
  animations: AnimationConfig;
  sidebar: SidebarConfig;
  titleBar: TitleBarConfig;
  windowShape: WindowShape;
}

export interface FontConfig {
  family: string;
  size: number;
  lineHeight: number;
}

export interface TerminalConfig {
  scrollback: number;
  cursorBlink: boolean;
  cursorStyle: 'block' | 'underline' | 'bar';
  defaultShell: string;
  defaultCwd: string;
}

export interface NotificationConfig {
  enabled: boolean;
  desktop: boolean;
  sound: boolean;
  onWaiting: boolean;
  onCompleted: boolean;
  onError: boolean;
}

export interface AnimationConfig {
  enabled: boolean;
  gooeyEffect: boolean;
  springPhysics: boolean;
  speed: number; // 0 = instant, 1 = normal, 2 = slow-mo
}

export interface SidebarConfig {
  visible: boolean;
  position: 'left' | 'right' | 'bottom';
  width: number;
}

export interface TitleBarConfig {
  position: 'top' | 'bottom' | 'left' | 'right' | 'hidden';
}

export type WindowShape = 'default' | 'rounded' | 'extra-rounded' | 'sharp';

// Inter-session message types
export interface InterSessionMessage {
  id: string;
  fromSessionId: string;
  toSessionId: string | 'broadcast';
  content: string;
  timestamp: string;
}

// Trigger types
export interface Trigger {
  id: string;
  name: string;
  pattern: string;
  flags: string;
  enabled: boolean;
  scope: 'global' | string;  // 'global' or sessionId
  actions: TriggerAction[];
  cooldownMs: number;
}

export type TriggerActionType = 'notification' | 'highlight' | 'command' | 'sound';

export interface TriggerAction {
  type: TriggerActionType;
  config: Record<string, unknown>;
}

// Workspace persistence types
export interface WorkspaceSnapshot {
  version: 1;
  savedAt: string;
  activeSessionId: string | null;
  sessionOrder: string[];
  triggers?: Trigger[];
  sessions: Array<{
    id: string;
    name: string;
    workingDir: string;
    agentType: AgentType | null;
    createdAt: string;
  }>;
  groups: Array<{
    id: string;
    name: string;
    layout: unknown;
    collapsed: boolean;
  }>;
}

// Event types
export type MoltenEventMap = {
  'session:created': { sessionId: string; name: string };
  'session:closed': { sessionId: string };
  'session:status-changed': {
    sessionId: string;
    oldStatus: SessionStatus;
    newStatus: SessionStatus;
  };
  'session:output': { sessionId: string; data: string };
  'session:input': { sessionId: string; data: string };
  'notification:received': MoltenNotification;
  'workspace:loaded': { name: string };
  'theme:changed': { theme: string };
  'trigger:matched': { triggerId: string; sessionId: string; matchText: string };
  'session:pipe-in': { toSessionId: string; content: string };
  'session:broadcast': { content: string; fromSessionId: string };
};
