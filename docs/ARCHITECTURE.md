# Molten — Technical Architecture

## 1. Overview

Molten is built on **Tauri 2** — a framework that combines a Rust backend with a web-based frontend rendered in a native WebView. This gives us native performance for process management (PTY, sockets, file I/O) while allowing rich, flexible UI via React.

```
┌─────────────────────────────────────────────────┐
│                  Molten App                     │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │            Rust Backend (Tauri)            │  │
│  │                                           │  │
│  │  ┌──────────┐  ┌───────────┐  ┌────────┐ │  │
│  │  │   PTY    │  │  Socket   │  │ Config │ │  │
│  │  │ Manager  │  │  Server   │  │Manager │ │  │
│  │  └──────────┘  └───────────┘  └────────┘ │  │
│  │  ┌──────────┐  ┌───────────┐  ┌────────┐ │  │
│  │  │ Session  │  │  Plugin   │  │  File  │ │  │
│  │  │ Manager  │  │  Loader   │  │  I/O   │ │  │
│  │  └──────────┘  └───────────┘  └────────┘ │  │
│  │                    │                      │  │
│  │                    │ Tauri IPC            │  │
│  │                    │ (invoke / events)    │  │
│  │                    ▼                      │  │
│  ├───────────────────────────────────────────┤  │
│  │           Frontend (WebView)              │  │
│  │                                           │  │
│  │  ┌──────────┐  ┌───────────┐  ┌────────┐ │  │
│  │  │  React   │  │  Docking  │  │ Plugin │ │  │
│  │  │   App    │  │  Engine   │  │  Host  │ │  │
│  │  └──────────┘  └───────────┘  └────────┘ │  │
│  │  ┌──────────┐  ┌───────────┐  ┌────────┐ │  │
│  │  │ xterm.js │  │  Zustand  │  │ Theme  │ │  │
│  │  │ Terminal │  │  Stores   │  │ Engine │ │  │
│  │  └──────────┘  └───────────┘  └────────┘ │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 2. Rust Backend

### 2.1 PTY Manager (`pty.rs`)

Responsible for spawning and managing pseudo-terminal processes.

**Windows:** Uses ConPTY (Console Pseudo Terminal) via the `conpty` crate or direct Win32 API calls.
**macOS/Linux:** Uses standard PTY via the `portable-pty` crate.

```rust
// Core PTY operations
trait PtyManager {
    fn spawn(config: PtyConfig) -> Result<PtyHandle>;
    fn read(handle: &PtyHandle) -> Result<Vec<u8>>;
    fn write(handle: &PtyHandle, data: &[u8]) -> Result<()>;
    fn resize(handle: &PtyHandle, cols: u16, rows: u16) -> Result<()>;
    fn kill(handle: &PtyHandle) -> Result<()>;
}

struct PtyConfig {
    shell: String,          // e.g., "bash", "powershell"
    cwd: PathBuf,           // Working directory
    env: HashMap<String, String>,  // Environment variables
    cols: u16,
    rows: u16,
}
```

**Data flow:**
```
PTY process stdout → PTY Manager → Tauri Event ("pty-output") → Frontend → xterm.js
User keyboard      → Frontend   → Tauri invoke ("pty-write") → PTY Manager → PTY stdin
```

### 2.2 Session Manager (`session.rs`)

Manages the lifecycle of all sessions. A session is the logical unit combining a PTY process with metadata.

```rust
struct Session {
    id: Uuid,
    name: String,
    pty: PtyHandle,
    status: SessionStatus,
    agent_type: Option<AgentType>,
    created_at: DateTime<Utc>,
    metadata: SessionMetadata,
}

enum SessionStatus {
    Thinking,
    Waiting,
    Idle,
    Error,
    Completed,
}

enum AgentType {
    ClaudeCode,
    Codex,
    GeminiCli,
    Aider,
    OpenCode,
    Unknown,
}

struct SessionMetadata {
    model: Option<String>,
    tokens_used: u64,
    cost_usd: f64,
    git_branch: Option<String>,
    working_dir: PathBuf,
}
```

**Status Detection Strategy:**

The session manager analyzes PTY output to determine agent status:

1. **Pattern matching** on terminal output (configurable regex patterns per agent type)
2. **Process state monitoring** (is the child process waiting for input?)
3. **Timing heuristics** (no output for N seconds → likely idle or waiting)

Default patterns:
```
Claude Code:
  - Thinking: "⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏" (spinner)
  - Waiting: ">" prompt at start of line
  - Error: "Error:|error:|ERR!|panic"
  - Completed: "Task completed|Done"
```

### 2.3 Socket Server (`socket.rs`)

Local IPC server for external tool integration.

**Windows:** Named pipe (`\\.\pipe\molten`)
**Unix:** Unix domain socket (`~/.molten/molten.sock`)

Protocol: JSON-RPC 2.0 over the socket.

```json
// Request
{
  "jsonrpc": "2.0",
  "method": "session.list",
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "result": [
    {
      "id": "abc-123",
      "name": "Session 1",
      "status": "thinking",
      "agent_type": "claude_code"
    }
  ],
  "id": 1
}
```

Available methods:
```
session.list          — List all sessions
session.create        — Create new session
session.close         — Close session
session.send          — Send text to session
session.getMetadata   — Get session metadata
notification.send     — Send notification
workspace.load        — Load workspace preset
workspace.save        — Save current layout
plugin.list           — List installed plugins
plugin.install        — Install plugin
```

### 2.4 Config Manager (`config.rs`)

Handles persistent configuration storage.

**Config location:**
- Windows: `%APPDATA%/molten/`
- macOS: `~/Library/Application Support/molten/`
- Linux: `~/.config/molten/`

**Files:**
```
config/
├── settings.json       # User settings
├── keybindings.json    # Custom keybindings
├── workspaces/         # Saved workspaces
│   ├── default.json
│   └── custom-1.json
├── themes/             # Custom themes
├── plugins/            # Plugin data
│   ├── registry.json   # Installed plugins
│   └── <plugin-name>/  # Per-plugin storage
└── sessions/           # Session persistence
    └── last-session.json
```

---

## 3. Frontend Architecture

### 3.1 Component Hierarchy

```
<App>
  <ThemeProvider>
    <DockingProvider>
      <WindowFrame>              // Custom title bar
        <TitleBar />
      </WindowFrame>
      <MainLayout>
        <Sidebar />              // Session list, workspaces, plugins
        <DockContainer>          // Main docking area
          <DockPanel>
            <TerminalPanel />    // xterm.js instance
          </DockPanel>
          <DockPanel>
            <TerminalPanel />
          </DockPanel>
          ...
        </DockContainer>
        <StatusBar />            // Bottom status bar
      </MainLayout>
      <CommandPalette />         // Ctrl+P overlay
      <NotificationPanel />     // Slide-in notifications
      <SettingsModal />         // Settings dialog
    </DockingProvider>
  </ThemeProvider>
</App>
```

### 3.2 State Management (Zustand)

```typescript
// Session Store
interface SessionStore {
  sessions: Map<string, Session>;
  activeSessionId: string | null;
  createSession: (config: SessionConfig) => Promise<string>;
  closeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  updateStatus: (id: string, status: SessionStatus) => void;
  updateMetadata: (id: string, metadata: Partial<SessionMetadata>) => void;
}

// Workspace Store
interface WorkspaceStore {
  currentLayout: DockLayout;
  presets: Map<string, DockLayout>;
  saveWorkspace: (name: string) => void;
  loadWorkspace: (name: string) => void;
  updateLayout: (layout: DockLayout) => void;
}

// Notification Store
interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  clearAll: () => void;
}

// Settings Store
interface SettingsStore {
  theme: string;
  font: FontConfig;
  keybindings: KeybindingConfig;
  notifications: NotificationConfig;
  animations: AnimationConfig;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}
```

### 3.3 Terminal Component

The `TerminalPanel` component wraps xterm.js and manages the connection to the Rust PTY backend.

```typescript
interface TerminalPanelProps {
  sessionId: string;
  fontSize?: number;
  fontFamily?: string;
}

// Key integration points:
// 1. PTY output → xterm.js write
//    Tauri event listener: listen("pty-output-{sessionId}", data => terminal.write(data))
//
// 2. xterm.js input → PTY write
//    terminal.onData(data => invoke("pty_write", { sessionId, data }))
//
// 3. Resize sync
//    terminal.onResize(({ cols, rows }) => invoke("pty_resize", { sessionId, cols, rows }))
//
// 4. Search addon for in-terminal search
//    SearchAddon for Ctrl+Shift+F functionality
//
// 5. WebGL addon for GPU-accelerated rendering
//    WebglAddon attached on mount for performance
```

### 3.4 Docking Engine

The docking system is the heart of Molten's UI flexibility. We use `rc-dock` as the base library and extend it with custom behaviors.

**Core capabilities:**
- Drag panels to dock zones (visual guides)
- Split horizontally/vertically
- Tab groups (merge panels)
- Floating panels (overlay)
- Detach to separate OS windows (Tauri `WebviewWindow`)
- Gooey animations on dock/undock

**Custom extensions:**
```typescript
interface MoltenDockConfig {
  // Gooey effect on merge/split
  enableGooeyEffect: boolean;
  gooeyIntensity: number; // 0-1

  // Spring physics on panel movement
  enableSpringPhysics: boolean;
  springStiffness: number;
  springDamping: number;

  // Allow any panel position for title bar, sidebar, etc.
  allowTitleBarDocking: boolean;
  allowStatusBarDocking: boolean;
}
```

### 3.5 Event Bus (Frontend)

TypeScript event emitter for component communication:

```typescript
type MoltenEvents = {
  'session:created': { sessionId: string };
  'session:closed': { sessionId: string };
  'session:status-changed': { sessionId: string; status: SessionStatus };
  'session:output': { sessionId: string; data: string };
  'panel:docked': { panelId: string; target: DockTarget };
  'panel:undocked': { panelId: string };
  'notification:received': { notification: Notification };
  'trigger:matched': { triggerId: string; sessionId: string; match: string };
  'workspace:loaded': { name: string };
  'theme:changed': { theme: string };
  'plugin:event': { pluginId: string; event: string; data: unknown };
};

// Usage
eventBus.on('session:status-changed', ({ sessionId, status }) => {
  if (status === 'waiting') {
    showNotification(`Session ${sessionId} needs your input`);
  }
});
```

---

## 4. Plugin System Architecture

### 4.1 Plugin Package Structure

```
my-molten-plugin/
├── package.json        # npm package with molten-plugin metadata
├── src/
│   ├── index.ts        # Plugin entry point
│   └── MyWidget.tsx    # Custom panel component (optional)
├── README.md
└── icon.svg            # Plugin icon
```

**package.json:**
```json
{
  "name": "molten-plugin-cost-tracker",
  "version": "1.0.0",
  "molten": {
    "displayName": "Cost Tracker",
    "description": "Real-time token usage and cost dashboard",
    "icon": "./icon.svg",
    "minMoltenVersion": "1.0.0",
    "permissions": ["session:read", "notification:write"],
    "panelTypes": ["cost-dashboard"],
    "settingsSchema": {
      "currency": { "type": "string", "default": "USD", "enum": ["USD", "EUR", "KRW"] },
      "alertThreshold": { "type": "number", "default": 10 }
    }
  }
}
```

### 4.2 Plugin Entry Point

```typescript
import { MoltenPlugin, PluginContext } from '@molten/plugin-api';

const plugin: MoltenPlugin = {
  activate(ctx: PluginContext) {
    // Register a custom panel type
    ctx.registerPanel('cost-dashboard', {
      title: 'Cost Dashboard',
      component: () => import('./CostDashboard'),
      icon: 'dollar-sign',
      defaultPosition: 'bottom',
    });

    // Register toolbar button
    ctx.registerToolbarButton({
      icon: 'bar-chart',
      tooltip: 'Toggle Cost Dashboard',
      onClick: () => ctx.togglePanel('cost-dashboard'),
    });

    // Listen to session events
    ctx.on('session:output', ({ sessionId, data }) => {
      // Parse token usage from output
      const tokens = parseTokenUsage(data);
      if (tokens) updateCost(sessionId, tokens);
    });

    // Register settings
    ctx.registerSettings({
      currency: { type: 'select', options: ['USD', 'EUR', 'KRW'] },
      alertThreshold: { type: 'number', label: 'Alert threshold ($)' },
    });
  },

  deactivate() {
    // Cleanup
  },
};

export default plugin;
```

### 4.3 Plugin API Surface

```typescript
interface PluginContext {
  // Panel management
  registerPanel(id: string, config: PanelConfig): void;
  togglePanel(id: string): void;
  showPanel(id: string): void;
  hidePanel(id: string): void;

  // Toolbar
  registerToolbarButton(config: ToolbarButtonConfig): void;

  // Sidebar
  registerSidebarItem(config: SidebarItemConfig): void;

  // Events
  on<E extends keyof MoltenEvents>(event: E, handler: (data: MoltenEvents[E]) => void): void;
  emit(event: string, data: unknown): void;

  // Sessions
  getSessions(): Session[];
  getSessionMetadata(sessionId: string): SessionMetadata;
  sendToSession(sessionId: string, text: string): void;

  // Notifications
  showNotification(config: NotificationConfig): void;

  // Settings
  registerSettings(schema: SettingsSchema): void;
  getSetting<T>(key: string): T;
  onSettingChanged(key: string, handler: (value: unknown) => void): void;

  // Keybindings
  registerKeybinding(config: KeybindingConfig): void;

  // Theme
  registerTheme(config: ThemeConfig): void;

  // Storage (per-plugin persistent storage)
  storage: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
  };

  // Inter-plugin communication
  broadcast(channel: string, data: unknown): void;
  onBroadcast(channel: string, handler: (data: unknown) => void): void;
}
```

### 4.4 Security Model

Plugins run in the same React context (not sandboxed iframes in Phase 1 for simplicity). However:

1. **Permission system** — plugins declare required permissions in package.json
2. **No direct Tauri invoke** — plugins can only use the PluginContext API
3. **Rate limiting** — plugins can't flood the event bus
4. **Review before marketplace listing** — community moderation

In a future phase, high-risk plugins could be sandboxed in iframes with message-passing.

---

## 5. Data Flow Diagrams

### 5.1 Terminal I/O

```
User types "hello"
    │
    ▼
xterm.js onData("hello")
    │
    ▼
Tauri invoke("pty_write", { sessionId, data: "hello" })
    │
    ▼
Rust PTY Manager → write to PTY stdin
    │
    ▼
Shell process receives "hello"
    │
    ▼
Shell output goes to PTY stdout
    │
    ▼
Rust PTY Manager reads output
    │
    ▼
Tauri emit("pty-output-{sessionId}", output)
    │
    ▼
Frontend event listener
    │
    ├─▶ xterm.js terminal.write(output)     → Screen update
    ├─▶ Status detector analyzes output      → Status update
    ├─▶ Trigger engine checks patterns       → Actions if matched
    └─▶ Plugin event bus                     → Plugins notified
```

### 5.2 Session Status Change

```
PTY output received
    │
    ▼
StatusDetector.analyze(output, agentType)
    │
    ├─ matches "thinking" pattern? → status = Thinking
    ├─ matches "waiting" pattern?  → status = Waiting
    ├─ matches "error" pattern?    → status = Error
    ├─ matches "completed" pattern?→ status = Completed
    └─ no match + no output for Ns → status = Idle
    │
    ▼
SessionStore.updateStatus(sessionId, newStatus)
    │
    ├─▶ Sidebar re-renders (status indicator)
    ├─▶ Panel header updates (status badge)
    ├─▶ NotificationStore checks rules
    │     └─ if (waiting && !focused) → desktop notification
    └─▶ EventBus emits "session:status-changed"
          └─ Plugins notified
```

### 5.3 Panel Dock/Undock

```
User drags panel header
    │
    ▼
DockingEngine.onDragStart(panelId)
    │
    ▼
Mouse moves over dock zone
    │
    ▼
DockingEngine shows dock guides (visual indicators)
    │
    ▼
User drops on dock zone
    │
    ▼
DockingEngine.onDrop(panelId, targetZone)
    │
    ├─ zone = "tab"    → merge into tab group
    ├─ zone = "left"   → split left
    ├─ zone = "right"  → split right
    ├─ zone = "top"    → split top
    ├─ zone = "bottom" → split bottom
    └─ zone = "outside"→ detach to new OS window
    │
    ▼
GooeyAnimation.play(mergeOrSplit)     → SVG filter animation
    │
    ▼
WorkspaceStore.updateLayout(newLayout) → Layout persisted
    │
    ▼
EventBus.emit("panel:docked")         → Plugins notified
```

---

## 6. Testing Strategy

### 6.1 Test Pyramid

```
         ┌─────────┐
         │  E2E    │  ← Playwright (full app tests)
        ┌┴─────────┴┐
        │Integration │  ← Vitest + Testing Library (component + store)
       ┌┴────────────┴┐
       │   Unit Tests  │  ← Vitest (utils, parsers, logic)
      ┌┴──────────────┴┐
      │  Rust Unit Tests│  ← cargo test (PTY, session, socket)
      └────────────────┘
```

### 6.2 Test Coverage Targets

| Layer | Tool | Target |
|---|---|---|
| Rust backend | `cargo test` | 80%+ for PTY manager, session manager, config |
| TypeScript utils | Vitest | 90%+ for parsers, status detection, event bus |
| React components | Vitest + Testing Library | 70%+ for interactive components |
| Plugin API | Vitest | 90%+ for API contract |
| E2E flows | Playwright + Tauri driver | Key user journeys |

### 6.3 Key Test Scenarios

**Rust:**
- PTY spawns shell and reads/writes correctly
- PTY handles resize events
- PTY cleanup on process exit
- Session lifecycle (create → active → close)
- Socket server accepts connections and routes messages
- Config read/write/migration

**Frontend:**
- Terminal renders PTY output correctly
- Status detection patterns match expected agent outputs
- Docking engine handles all dock zone types
- Workspace save/load preserves layout accurately
- Notifications appear for correct status transitions
- Plugin API contract (register, events, storage)
- Keybindings work in correct contexts
- Theme switching applies all CSS variables

**E2E:**
- Launch app → create session → type command → see output
- Split panel → drag to rearrange → save workspace → reload → layout restored
- Multiple sessions → status indicators update correctly
- Notification appears when agent finishes while unfocused
- Plugin install → plugin panel visible → plugin settings work

---

## 7. Performance Budgets

| Metric | Target | Measurement |
|---|---|---|
| Cold start | <2s | Time from launch to first terminal cursor |
| Hot start (resume) | <500ms | Time to restore last session |
| Terminal input latency | <5ms | Key press to character rendered |
| Terminal throughput | >50MB/s | Large output streaming (e.g., `cat big-file`) |
| Animation FPS | 60fps | During dock/undock animations |
| Memory per session | <50MB | Baseline per terminal instance |
| Memory baseline | <100MB | App with one session, idle |
| Installer size | <20MB | Platform-specific installer |

---

## 8. Platform-Specific Notes

### Windows
- PTY: ConPTY (Windows 10 1809+)
- Default shell: PowerShell or Git Bash (auto-detect)
- Socket: Named pipe (`\\.\pipe\molten`)
- Window management: Win32 API for frameless window, DWM for blur effects
- Installer: MSI via WiX (Tauri default) + portable ZIP
- Auto-update: Tauri updater plugin

### macOS
- PTY: POSIX PTY (`openpty`)
- Default shell: zsh
- Socket: Unix domain socket (`~/.molten/molten.sock`)
- Window management: AppKit via Tauri, vibrancy effects native
- Installer: .dmg
- Auto-update: Sparkle via Tauri updater

### Linux
- PTY: POSIX PTY
- Default shell: bash
- Socket: Unix domain socket
- Window management: GTK/X11/Wayland via Tauri
- Installer: .deb, .rpm, AppImage
- Auto-update: manual or package manager

---

## 9. Dependencies (Initial)

### Rust (Cargo.toml)
```
tauri = "2"
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
uuid = { version = "1", features = ["v4"] }
portable-pty = "0.8"          # Cross-platform PTY
regex = "1"                    # Status detection patterns
chrono = { version = "0.4", features = ["serde"] }
dirs = "5"                     # Platform config directories
```

### Frontend (package.json)
```
react: ^18
react-dom: ^18
typescript: ^5
@tauri-apps/api: ^2
@xterm/xterm: ^5
@xterm/addon-webgl: ^0.18
@xterm/addon-fit: ^0.10
@xterm/addon-search: ^0.15
zustand: ^5
rc-dock: ^3
framer-motion: ^11
lucide-react: ^0.400
tailwindcss: ^4
vite: ^6
vitest: ^3
@testing-library/react: ^16
playwright: ^1
```
