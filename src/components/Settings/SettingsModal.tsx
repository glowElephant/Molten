import { useState } from 'react';
import { X, Settings } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import './SettingsModal.css';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

type SettingsTab = 'general' | 'terminal' | 'notifications' | 'appearance';

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { settings, updateNestedSetting, resetSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  if (!visible) return null;

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'appearance', label: 'Appearance' },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
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
          </div>
        </div>

        <div className="settings-modal__footer">
          <button className="settings-modal__reset" onClick={resetSettings}>
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
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
