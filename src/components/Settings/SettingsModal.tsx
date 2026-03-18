import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Settings, Plus, Trash2 } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTriggerStore, generateTriggerId } from '../../stores/triggerStore';
import type { Trigger } from '../../types';
import './SettingsModal.css';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

type SettingsTab = 'general' | 'terminal' | 'notifications' | 'appearance' | 'triggers';

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { settings, updateSetting, updateNestedSetting, resetSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  if (!visible) return null;

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'triggers', label: 'Triggers' },
  ];

  return (
    <motion.div
      className="settings-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="settings-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25, mass: 0.8 }}
      >
        <div className="settings-modal__header">
          <div className="settings-modal__title">
            <Settings size={16} />
            <span>Settings</span>
          </div>
          <button className="settings-modal__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="settings-modal__body">
          <div className="settings-modal__tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`settings-modal__tab ${
                  activeTab === tab.id ? 'settings-modal__tab--active' : ''
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="settings-modal__content">
            {activeTab === 'general' && (
              <div className="settings-section">
                <h3>Sidebar</h3>
                <SettingRow label="Position">
                  <select
                    value={settings.sidebar.position}
                    onChange={(e) =>
                      updateNestedSetting('sidebar', 'position', e.target.value as 'left' | 'right')
                    }
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </SettingRow>
                <SettingRow label="Width">
                  <input
                    type="range"
                    min={180}
                    max={400}
                    value={settings.sidebar.width}
                    onChange={(e) =>
                      updateNestedSetting('sidebar', 'width', Number(e.target.value))
                    }
                  />
                  <span className="settings-value">{settings.sidebar.width}px</span>
                </SettingRow>

                <h3>Title Bar</h3>
                <SettingRow label="Position">
                  <select
                    value={settings.titleBar.position}
                    onChange={(e) =>
                      updateNestedSetting(
                        'titleBar',
                        'position',
                        e.target.value as 'top' | 'bottom' | 'hidden'
                      )
                    }
                  >
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </SettingRow>
              </div>
            )}

            {activeTab === 'terminal' && (
              <div className="settings-section">
                <h3>Font</h3>
                <SettingRow label="Family">
                  <input
                    type="text"
                    value={settings.font.family}
                    onChange={(e) =>
                      updateNestedSetting('font', 'family', e.target.value)
                    }
                  />
                </SettingRow>
                <SettingRow label="Size">
                  <input
                    type="number"
                    min={8}
                    max={32}
                    value={settings.font.size}
                    onChange={(e) =>
                      updateNestedSetting('font', 'size', Number(e.target.value))
                    }
                  />
                </SettingRow>

                <h3>Behavior</h3>
                <SettingRow label="Scrollback lines">
                  <input
                    type="number"
                    min={1000}
                    max={100000}
                    step={1000}
                    value={settings.terminal.scrollback}
                    onChange={(e) =>
                      updateNestedSetting('terminal', 'scrollback', Number(e.target.value))
                    }
                  />
                </SettingRow>
                <SettingRow label="Cursor blink">
                  <ToggleSwitch
                    checked={settings.terminal.cursorBlink}
                    onChange={(v) => updateNestedSetting('terminal', 'cursorBlink', v)}
                  />
                </SettingRow>
                <SettingRow label="Cursor style">
                  <select
                    value={settings.terminal.cursorStyle}
                    onChange={(e) =>
                      updateNestedSetting(
                        'terminal',
                        'cursorStyle',
                        e.target.value as 'block' | 'underline' | 'bar'
                      )
                    }
                  >
                    <option value="bar">Bar</option>
                    <option value="block">Block</option>
                    <option value="underline">Underline</option>
                  </select>
                </SettingRow>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="settings-section">
                <h3>Notifications</h3>
                <SettingRow label="Enable notifications">
                  <ToggleSwitch
                    checked={settings.notifications.enabled}
                    onChange={(v) => updateNestedSetting('notifications', 'enabled', v)}
                  />
                </SettingRow>
                <SettingRow label="When agent is waiting">
                  <ToggleSwitch
                    checked={settings.notifications.onWaiting}
                    onChange={(v) => updateNestedSetting('notifications', 'onWaiting', v)}
                  />
                </SettingRow>
                <SettingRow label="When task completes">
                  <ToggleSwitch
                    checked={settings.notifications.onCompleted}
                    onChange={(v) => updateNestedSetting('notifications', 'onCompleted', v)}
                  />
                </SettingRow>
                <SettingRow label="When error occurs">
                  <ToggleSwitch
                    checked={settings.notifications.onError}
                    onChange={(v) => updateNestedSetting('notifications', 'onError', v)}
                  />
                </SettingRow>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="settings-section">
                <h3>Theme</h3>
                <SettingRow label="Color scheme">
                  <select
                    value={settings.theme}
                    onChange={(e) => updateSetting('theme', e.target.value)}
                  >
                    <option value="obsidian">Obsidian</option>
                    <option value="dracula">Dracula</option>
                    <option value="nord">Nord</option>
                    <option value="monokai">Monokai</option>
                    <option value="cyberpunk">Cyberpunk</option>
                    <option value="catppuccin">Catppuccin</option>
                    <option value="solarized">Solarized Dark</option>
                    <option value="midnight">Midnight Blue</option>
                    <option value="matrix">Matrix</option>
                    <option value="sunset">Sunset</option>
                    <option value="arctic">Arctic</option>
                    <option value="ember">Ember</option>
                  </select>
                </SettingRow>

                <h3>Animations</h3>
                <SettingRow label="Enable animations">
                  <ToggleSwitch
                    checked={settings.animations.enabled}
                    onChange={(v) => updateNestedSetting('animations', 'enabled', v)}
                  />
                </SettingRow>
                <SettingRow label="Gooey effect">
                  <ToggleSwitch
                    checked={settings.animations.gooeyEffect}
                    onChange={(v) => updateNestedSetting('animations', 'gooeyEffect', v)}
                  />
                </SettingRow>
                <SettingRow label="Animation speed">
                  <select
                    value={settings.animations.speed}
                    onChange={(e) =>
                      updateNestedSetting('animations', 'speed', Number(e.target.value))
                    }
                  >
                    <option value={0}>Instant</option>
                    <option value={1}>Normal</option>
                    <option value={2}>Slow</option>
                  </select>
                </SettingRow>

              </div>
            )}
            {activeTab === 'triggers' && <TriggersTab />}
          </div>
        </div>

        <div className="settings-modal__footer">
          <button className="settings-modal__reset" onClick={resetSettings}>
            Reset to defaults
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="setting-row">
      <label className="setting-row__label">{label}</label>
      <div className="setting-row__control">{children}</div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      className={`toggle-switch ${checked ? 'toggle-switch--on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="toggle-switch__thumb" />
    </button>
  );
}

function TriggersTab() {
  const { triggers, addTrigger, updateTrigger, removeTrigger, toggleTrigger } = useTriggerStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = () => {
    const trigger: Trigger = {
      id: generateTriggerId(),
      name: 'New Trigger',
      pattern: '',
      flags: 'i',
      enabled: true,
      scope: 'global',
      actions: [{ type: 'notification', config: {} }],
      cooldownMs: 5000,
    };
    addTrigger(trigger);
    setEditingId(trigger.id);
  };

  const isValidRegex = (pattern: string, flags: string) => {
    try {
      new RegExp(pattern, flags);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="settings-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Triggers</h3>
        <button className="settings-modal__add-btn" onClick={handleAdd}>
          <Plus size={12} /> Add Trigger
        </button>
      </div>

      {triggers.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>
          No triggers yet. Add one to match patterns in terminal output.
        </p>
      )}

      {triggers.map((trigger) => {
        const isEditing = editingId === trigger.id;
        const valid = !trigger.pattern || isValidRegex(trigger.pattern, trigger.flags);

        return (
          <div
            key={trigger.id}
            className="trigger-item"
            style={{
              padding: '10px 12px',
              margin: '6px 0',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              background: trigger.enabled ? 'rgba(255,255,255,0.02)' : 'transparent',
              opacity: trigger.enabled ? 1 : 0.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isEditing ? 8 : 0 }}>
              <ToggleSwitch
                checked={trigger.enabled}
                onChange={() => toggleTrigger(trigger.id)}
              />
              {isEditing ? (
                <input
                  type="text"
                  value={trigger.name}
                  onChange={(e) => updateTrigger(trigger.id, { name: e.target.value })}
                  style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '4px 8px' }}
                  placeholder="Trigger name"
                />
              ) : (
                <span
                  style={{ flex: 1, fontSize: 13, cursor: 'pointer', color: 'var(--color-text-primary)' }}
                  onClick={() => setEditingId(trigger.id)}
                >
                  {trigger.name}
                </span>
              )}
              {!isEditing && (
                <code style={{ fontSize: 11, color: valid ? 'var(--color-accent)' : '#ef4444', opacity: 0.7 }}>
                  /{trigger.pattern || '...'}/{trigger.flags}
                </code>
              )}
              <button
                className="settings-modal__icon-btn"
                onClick={() => setEditingId(isEditing ? null : trigger.id)}
                title={isEditing ? 'Done' : 'Edit'}
              >
                {isEditing ? '✓' : '✎'}
              </button>
              <button
                className="settings-modal__icon-btn settings-modal__icon-btn--danger"
                onClick={() => removeTrigger(trigger.id)}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {isEditing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 44 }}>
                <SettingRow label="Pattern (regex)">
                  <input
                    type="text"
                    value={trigger.pattern}
                    onChange={(e) => updateTrigger(trigger.id, { pattern: e.target.value })}
                    placeholder="error|fail|exception"
                    style={{ borderColor: valid ? undefined : '#ef4444' }}
                  />
                </SettingRow>
                <SettingRow label="Flags">
                  <input
                    type="text"
                    value={trigger.flags}
                    onChange={(e) => updateTrigger(trigger.id, { flags: e.target.value })}
                    style={{ width: 60 }}
                  />
                </SettingRow>
                <SettingRow label="Scope">
                  <select
                    value={trigger.scope}
                    onChange={(e) => updateTrigger(trigger.id, { scope: e.target.value })}
                  >
                    <option value="global">All sessions</option>
                  </select>
                </SettingRow>
                <SettingRow label="Action">
                  <select
                    value={trigger.actions[0]?.type || 'notification'}
                    onChange={(e) => updateTrigger(trigger.id, {
                      actions: [{ type: e.target.value as any, config: {} }],
                    })}
                  >
                    <option value="notification">Notification</option>
                    <option value="command">Run command</option>
                    <option value="sound">Play sound</option>
                  </select>
                </SettingRow>
                {trigger.actions[0]?.type === 'command' && (
                  <SettingRow label="Command">
                    <input
                      type="text"
                      value={(trigger.actions[0]?.config?.command as string) || ''}
                      onChange={(e) => updateTrigger(trigger.id, {
                        actions: [{ type: 'command', config: { command: e.target.value, sessionId: 'self' } }],
                      })}
                      placeholder="echo 'triggered!'"
                    />
                  </SettingRow>
                )}
                <SettingRow label="Cooldown (ms)">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={trigger.cooldownMs}
                    onChange={(e) => updateTrigger(trigger.id, { cooldownMs: Number(e.target.value) })}
                  />
                </SettingRow>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
