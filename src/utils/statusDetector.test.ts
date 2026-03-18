import { describe, it, expect } from 'vitest';
import { detectStatus, detectAgentType, getStatusColor, getStatusLabel } from './statusDetector';

describe('detectStatus', () => {
  describe('Claude Code patterns', () => {
    it('should detect thinking status from spinner', () => {
      expect(detectStatus('⠋ Working...', 'claude_code')).toBe('thinking');
      expect(detectStatus('⠹', 'claude_code')).toBe('thinking');
    });

    it('should detect waiting status from prompt', () => {
      expect(detectStatus('> ', 'claude_code')).toBe('waiting');
      expect(detectStatus('Continue? (y/n)', 'claude_code')).toBe('waiting');
    });

    it('should detect error status', () => {
      expect(detectStatus('Error: something went wrong', 'claude_code')).toBe('error');
      expect(detectStatus('error: file not found', 'claude_code')).toBe('error');
      expect(detectStatus('ERR! build failed', 'claude_code')).toBe('error');
    });

    it('should detect completed status', () => {
      expect(detectStatus('Task completed', 'claude_code')).toBe('completed');
      expect(detectStatus('Done.', 'claude_code')).toBe('completed');
    });

    it('should return null for unrecognized output', () => {
      expect(detectStatus('some random output text', 'claude_code')).toBeNull();
    });
  });

  describe('unknown agent type', () => {
    it('should still detect errors with default patterns', () => {
      expect(detectStatus('Error: something broke', 'unknown')).toBe('error');
    });

    it('should return null for non-error output', () => {
      expect(detectStatus('hello world', 'unknown')).toBeNull();
    });
  });

  describe('null agent type', () => {
    it('should use default patterns', () => {
      expect(detectStatus('FAILED to compile', null)).toBe('error');
      expect(detectStatus('hello world', null)).toBeNull();
    });
  });
});

describe('detectAgentType', () => {
  it('should detect Claude Code', () => {
    expect(detectAgentType('claude')).toBe('claude_code');
    expect(detectAgentType('Claude Code')).toBe('claude_code');
  });

  it('should detect Codex', () => {
    expect(detectAgentType('codex')).toBe('codex');
  });

  it('should detect Gemini CLI', () => {
    expect(detectAgentType('gemini')).toBe('gemini_cli');
  });

  it('should detect Aider', () => {
    expect(detectAgentType('aider')).toBe('aider');
  });

  it('should detect OpenCode', () => {
    expect(detectAgentType('opencode')).toBe('opencode');
  });

  it('should return null for unknown commands', () => {
    expect(detectAgentType('ls -la')).toBeNull();
    expect(detectAgentType('vim')).toBeNull();
    expect(detectAgentType('')).toBeNull();
  });
});

describe('getStatusColor', () => {
  it('should return correct CSS variable for each status', () => {
    expect(getStatusColor('thinking')).toContain('thinking');
    expect(getStatusColor('waiting')).toContain('waiting');
    expect(getStatusColor('idle')).toContain('idle');
    expect(getStatusColor('error')).toContain('error');
    expect(getStatusColor('completed')).toContain('completed');
  });
});

describe('getStatusLabel', () => {
  it('should return human-readable labels', () => {
    expect(getStatusLabel('thinking')).toBe('Thinking');
    expect(getStatusLabel('waiting')).toBe('Waiting for input');
    expect(getStatusLabel('idle')).toBe('Idle');
    expect(getStatusLabel('error')).toBe('Error');
    expect(getStatusLabel('completed')).toBe('Completed');
  });
});
