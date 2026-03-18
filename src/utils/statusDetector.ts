import type { AgentType, SessionStatus } from '../types';

interface StatusPattern {
  status: SessionStatus;
  patterns: RegExp[];
}

const AGENT_PATTERNS: Record<string, StatusPattern[]> = {
  claude_code: [
    {
      status: 'thinking',
      patterns: [
        /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/, // Spinner characters
        /Working\.{1,3}$/,
        /Thinking\.{1,3}$/,
      ],
    },
    {
      status: 'waiting',
      patterns: [
        /^>\s*$/, // Empty prompt
        /\?\s*$/, // Question prompt
        /\(y\/n\)/i,
        /approve|deny|allow/i,
      ],
    },
    {
      status: 'error',
      patterns: [
        /^Error:/m,
        /^error:/m,
        /ERR!/,
        /panic/,
        /FAILED/,
        /Exception:/,
      ],
    },
    {
      status: 'completed',
      patterns: [
        /Task completed/i,
        /Done[.!]?\s*$/,
        /Finished/i,
      ],
    },
  ],
  default: [
    {
      status: 'error',
      patterns: [/^Error:/m, /^error:/m, /FAILED/],
    },
  ],
};

/**
 * Analyze terminal output to detect the current status of an AI agent.
 * Uses pattern matching against known agent output patterns.
 */
export function detectStatus(
  output: string,
  agentType: AgentType | null
): SessionStatus | null {
  const patterns = AGENT_PATTERNS[agentType || 'default'] || AGENT_PATTERNS.default;

  for (const statusPattern of patterns) {
    for (const pattern of statusPattern.patterns) {
      if (pattern.test(output)) {
        return statusPattern.status;
      }
    }
  }

  return null;
}

/**
 * Detect the type of AI agent from the command that was run.
 */
export function detectAgentType(command: string): AgentType | null {
  const normalizedCommand = command.toLowerCase().trim();

  if (normalizedCommand.includes('claude')) return 'claude_code';
  if (normalizedCommand.includes('codex')) return 'codex';
  if (normalizedCommand.includes('gemini')) return 'gemini_cli';
  if (normalizedCommand.includes('aider')) return 'aider';
  if (normalizedCommand.includes('opencode')) return 'opencode';

  return null;
}

/**
 * Get the display color for a session status.
 */
export function getStatusColor(status: SessionStatus): string {
  switch (status) {
    case 'thinking':
      return 'var(--color-status-thinking, #3b82f6)';
    case 'waiting':
      return 'var(--color-status-waiting, #f59e0b)';
    case 'idle':
      return 'var(--color-status-idle, #6b7280)';
    case 'error':
      return 'var(--color-status-error, #ef4444)';
    case 'completed':
      return 'var(--color-status-completed, #22c55e)';
    default:
      return 'var(--color-status-idle, #6b7280)';
  }
}

/**
 * Get human-readable label for a session status.
 */
export function getStatusLabel(status: SessionStatus): string {
  switch (status) {
    case 'thinking':
      return 'Thinking';
    case 'waiting':
      return 'Waiting for input';
    case 'idle':
      return 'Idle';
    case 'error':
      return 'Error';
    case 'completed':
      return 'Completed';
    default:
      return 'Unknown';
  }
}
