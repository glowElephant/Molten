import { X } from 'lucide-react';
import './KeybindingGuide.css';

interface KeybindingGuideProps {
  visible: boolean;
  onClose: () => void;
}

const KEYBINDINGS = [
  { category: 'Sessions', bindings: [
    { keys: 'Ctrl+N', action: 'New session' },
    { keys: 'Ctrl+W', action: 'Close active session' },
    { keys: 'Ctrl+1~9', action: 'Switch to session N' },
    { keys: 'Ctrl+Tab', action: 'Next session' },
  ]},
  { category: 'Split View', bindings: [
    { keys: 'Ctrl+D', action: 'Split horizontal (left/right)' },
    { keys: 'Ctrl+Shift+D', action: 'Split vertical (top/bottom)' },
  ]},
  { category: 'UI', bindings: [
    { keys: 'Ctrl+B', action: 'Toggle sidebar' },
    { keys: 'Ctrl+P', action: 'Command palette' },
    { keys: 'Ctrl+,', action: 'Settings' },
    { keys: 'Ctrl+Shift+N', action: 'Toggle notifications' },
    { keys: 'Ctrl+?', action: 'This guide' },
    { keys: 'Escape', action: 'Close overlay' },
  ]},
  { category: 'Terminal', bindings: [
    { keys: 'Ctrl+Shift+V', action: 'Paste' },
  ]},
];

export function KeybindingGuide({ visible, onClose }: KeybindingGuideProps) {
  if (!visible) return null;

  return (
    <div className="keybinding-overlay" onClick={onClose}>
      <div className="keybinding-guide" onClick={(e) => e.stopPropagation()}>
        <div className="keybinding-guide__header">
          <span>Keyboard Shortcuts</span>
          <button className="keybinding-guide__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="keybinding-guide__body">
          {KEYBINDINGS.map((group) => (
            <div key={group.category} className="keybinding-group">
              <h3 className="keybinding-group__title">{group.category}</h3>
              {group.bindings.map((binding) => (
                <div key={binding.keys} className="keybinding-row">
                  <kbd className="keybinding-row__keys">{binding.keys}</kbd>
                  <span className="keybinding-row__action">{binding.action}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
