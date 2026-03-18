import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, X, Maximize2, Minimize2 } from 'lucide-react';
import './TitleBar.css';

interface TitleBarProps {
  position?: 'top' | 'bottom' | 'left' | 'right' | 'hidden';
}

export function TitleBar({ position = 'top' }: TitleBarProps) {
  if (position === 'hidden') return null;

  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial state
    appWindow.isMaximized().then(setIsMaximized);

    // Listen for resize events to update icon
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    appWindow.minimize();
  };
  const handleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isMaximized) {
      appWindow.unmaximize();
    } else {
      appWindow.maximize();
    }
  };
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    appWindow.close();
  };

  const isVertical = position === 'left' || position === 'right';

  return (
    <div
      className={`titlebar titlebar--${position} ${isVertical ? 'titlebar--vertical' : ''}`}
      data-tauri-drag-region
    >
      <div className="titlebar__brand" data-tauri-drag-region>
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
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
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
