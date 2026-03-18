import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { useSettingsStore } from './stores/settingsStore';
import './App.css';

function App() {
  const { settings } = useSettingsStore();
  const { sidebar, titleBar } = settings;

  return (
    <div className="app" data-theme={settings.theme}>
      {titleBar.position === 'top' && <TitleBar position="top" />}

      <div className="app__body">
        {titleBar.position === 'left' && <TitleBar position="left" />}

        {sidebar.position === 'left' && <Sidebar />}

        <main className="app__content">
          <div className="app__placeholder">
            <div className="app__placeholder-logo">◆</div>
            <h1 className="app__placeholder-title">Molten</h1>
            <p className="app__placeholder-subtitle">
              The liquid terminal for AI coding agents
            </p>
            <p className="app__placeholder-hint">
              Press <kbd>Ctrl+N</kbd> to create a new session
            </p>
          </div>
        </main>

        {sidebar.position === 'right' && <Sidebar />}
        {titleBar.position === 'right' && <TitleBar position="right" />}
      </div>

      {sidebar.position === 'bottom' && <Sidebar />}
      {titleBar.position === 'bottom' && <TitleBar position="bottom" />}

      <StatusBar />
    </div>
  );
}

export default App;
