import { describe, it, expect } from 'vitest';
import { useWorkspaceStore } from './workspaceStore';

describe('WorkspaceStore', () => {
  it('should have built-in presets', () => {
    const presets = useWorkspaceStore.getState().presets;
    expect(presets.length).toBeGreaterThanOrEqual(4);
    expect(presets.find((p) => p.name === 'Focus')).toBeDefined();
    expect(presets.find((p) => p.name === 'Dual')).toBeDefined();
    expect(presets.find((p) => p.name === 'Triple')).toBeDefined();
    expect(presets.find((p) => p.name === 'Stack')).toBeDefined();
  });

  it('should add a custom preset', () => {
    useWorkspaceStore.getState().addPreset({
      name: 'Custom',
      description: 'test',
      layout: null,
      sessionCount: 1,
      createdAt: new Date().toISOString(),
    });
    expect(useWorkspaceStore.getState().getPreset('Custom')).toBeDefined();
  });

  it('should remove a preset', () => {
    useWorkspaceStore.getState().removePreset('Custom');
    expect(useWorkspaceStore.getState().getPreset('Custom')).toBeUndefined();
  });

  it('should get preset by name', () => {
    const dual = useWorkspaceStore.getState().getPreset('Dual');
    expect(dual?.sessionCount).toBe(2);
  });
});
