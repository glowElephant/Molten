import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, X, Maximize2 } from 'lucide-react';
import './TitleBar.css';

interface TitleBarProps {
  position?: 'top' | 'bottom' | 'left' | 'right' | 'hidden';
}

export function TitleBar({ position = 'top' }: TitleBarProps) {
  if (position === 'hidden') return null;

  const appWindow = getCurrentWindow();

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = async () => {
    const isMaximized = await appWindow.isMaximized();
    if (isMaximized) {
      appWindow.unmaximize();
    } else {
      appWindow.maximize();
    }
  };
  const handleClose = () => appWindow.close();
  const handleDragStart = () => appWindow.startDragging();

  const isVertical = position === 'left' || position === 'right';

  return (
    <div
      className={`titlebar titlebar--${position} ${isVertical ? 'titlebar--vertical' : ''}`}
      onMouseDown={handleDragStart}
    >
      <div className="titlebar__brand">
        <span className="titlebar__logo">◆</span>
        {!isVertical && <span className="titlebar__title">Molten</span>}
      </div>

      <div className={`titlebar__controls ${isVertical ? 'titlebar__controls--vertical' : ''}`}>
        <button
          className="titlebar__button titlebar__button--minimize"
          onClick={handleMinimize}
          aria-label="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          className="titlebar__button titlebar__button--maximize"
          onClick={handleMaximize}
          aria-label="Maximize"
        >
          <Maximize2 size={12} />
        </button>
        <button
          className="titlebar__button titlebar__button--close"
          onClick={handleClose}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
