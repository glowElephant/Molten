# Molten — Product Specification

> The liquid terminal for AI coding agents — dock, split, merge, and reshape everything.

## Implementation Status (2026-03-18)

### Completed (Phase 1 MVP)
- [x] Terminal rendering (xterm.js + ConPTY/PTY)
- [x] Multi-session management (create/switch/close/rename)
- [x] Split view (horizontal/vertical, N-way equal split)
- [x] Split pane headers (session name + close button)
- [x] Sidebar (session list, index numbers, toggle, left/right position)
- [x] Custom title bar (minimize/maximize/close, icon toggle)
- [x] Status bar (model/tokens/cost/notification badge)
- [x] Notification panel (auto-notifications on status change)
- [x] Settings UI (4 tabs: General, Terminal, Notifications, Appearance)
- [x] Settings persistence (JSON file, survives restart)
- [x] Command palette (Ctrl+P, search all actions)
- [x] Keybinding guide (Ctrl+Shift+?)
- [x] Workspace presets (Focus, Dual, Triple, Stack)
- [x] Dark Glassmorphism theme
- [x] 69 tests (58 TypeScript + 11 Rust)
- [x] Dev API server + window self-capture (automated testing)

### Phase 1.5 (Next)
- [ ] Session grouping system
- [ ] Sidebar drag reorder
- [ ] Docking system (drag panels to dock/undock)
- [ ] Auto-start claude on session creation (option)

### Phase 2 (Polish)
- [ ] Gooey merge/tear animations
- [ ] Block-based output
- [ ] Inter-session communication
- [ ] Triggers (regex-based automation)
- [ ] Session persistence (survive restart)
- [ ] Quick terminal (Quake mode)

### Phase 3 (Ecosystem)
- [ ] Plugin system + API
- [ ] Theme engine
- [ ] Plugin marketplace

---

## 1. Vision

Molten is a **desktop terminal wrapper** purpose-built for running and managing multiple AI coding agent sessions (Claude Code, Codex, Gemini CLI, Aider, OpenCode, etc.).

The core philosophy is **"liquid freedom"** — every UI element can be docked, undocked, split, merged, reshaped, and repositioned. Panels merge like water droplets and tear apart with fluid physics animations. The window itself can take any shape.

Molten is **not** a terminal emulator from scratch. It wraps existing shells (bash, PowerShell, cmd, zsh) via a pseudo-terminal layer (ConPTY on Windows, PTY on Unix) and renders them using xterm.js — the same engine VS Code uses.

### What Makes Molten Different

| Gap in Ecosystem | Molten's Answer |
|---|---|
| Most multi-agent tools are tmux-based (macOS/Linux only) | Native Windows + cross-platform support |
| No tool has a plugin architecture | First-class plugin system with API + marketplace |
| Tools are single-purpose (monitor OR session OR cost) | All-in-one: sessions + monitor + cost + notifications |
| No inter-session communication | Message bus between agent sessions |
| All tools look like TUIs | Modern Dark Glassmorphism GUI with physics animations |
| Fixed layouts | Fully liquid docking system with any-shape windows |

### Target Users

- Developers running multiple Claude Code sessions in parallel
- AI agent power users managing complex multi-agent workflows
- Anyone who wants a modern, beautiful, extensible terminal experience

---

## 2. Core Concepts

### 2.1 Liquid Docking System

Every UI element in Molten is a **Panel**. Panels can be:

- **Docked** — attached to the main window or other panels
- **Floating** — independent overlay windows
- **Detached** — torn off as separate OS windows
- **Merged** — combined with other panels (tab group)
- **Split** — divided horizontally or vertically

Panels merge and separate with **gooey fluid animations** (SVG filter-based). When two panels approach each other, they visually stretch and blob together like water droplets. When torn apart, they stretch and snap with physics-based spring animations.

**Any panel can go anywhere:**
- Title bar → top, bottom, left, right, or hidden
- Sidebar → any edge
- Status bar → any edge
- Prompt input → separate panel, can be detached

### 2.2 Session

A Session is a single AI agent instance (e.g., one Claude Code process). Each session has:

- **Terminal surface** — the actual terminal output (xterm.js)
- **Prompt input** — text input area (can be separated from output)
- **Status** — thinking / waiting / idle / error / completed
- **Metadata** — model, tokens used, cost, duration, git branch
- **Notifications** — queue of alerts from the agent

### 2.3 Workspace

A Workspace is a saved arrangement of panels and sessions. Users can:

- Save current layout as a named workspace
- Switch between workspaces
- Share workspaces as JSON files (community presets)

### 2.4 Preset

Pre-configured workspace layouts shipped with Molten or installed from the community:

| Preset | Description |
|---|---|
| **Focus** | Single session, full screen, minimal UI |
| **Dual** | Two sessions side by side |
| **Monitor** | Grid of 4+ sessions with status dashboard |
| **Command Center** | Sessions + cost dashboard + notification panel + file preview |

### 2.5 Plugin

A self-contained extension that adds functionality to Molten. Plugins can:

- Add new panel types (widgets)
- Add sidebar items
- Hook into session events
- Add toolbar buttons
- Modify themes and animations
- Register keyboard shortcuts
- Communicate with sessions

---

## 3. Feature Specification

### Phase 1: Core (MVP)

#### F1.1 Terminal Rendering
- xterm.js-based terminal emulation
- ConPTY (Windows) / PTY (macOS/Linux) backend via Tauri Rust layer
- GPU-accelerated rendering via WebGL addon
- True color (24-bit), Unicode, emoji support
- Configurable font, font size, line height
- Search within terminal output (Ctrl+Shift+F)
- Scrollback buffer (configurable, default 10,000 lines)

#### F1.2 Multi-Session Management
- Create new sessions (Ctrl+N)
- Each session runs in its own PTY process
- Session list in sidebar with status indicators
- Click to switch between sessions
- Close session with confirmation if agent is running
- Auto-detect agent type (Claude Code, Codex, etc.) from process name
- Session naming and renaming

#### F1.3 Docking System
- Drag panels to dock zones (top, bottom, left, right, center-tab)
- Visual guides show dock targets while dragging
- Split panels horizontally (Ctrl+Shift+D) or vertically (Ctrl+D)
- Merge panels into tab groups by dragging onto center
- Detach panels to separate OS windows (drag outside main window)
- Re-attach by dragging back
- Resize panels by dragging borders
- Double-click border to auto-resize (equal split)

#### F1.4 Status Detection
- Parse terminal output to detect agent state:
  - **Thinking** — agent is processing (spinner/animation visible)
  - **Waiting** — agent is waiting for user input/approval
  - **Idle** — prompt is ready, no activity
  - **Error** — error detected in output
  - **Completed** — task finished successfully
- Status shown as colored indicator in sidebar and panel header
- Status colors: thinking=blue, waiting=orange, idle=gray, error=red, completed=green

#### F1.5 Notification System
- Desktop notifications when:
  - Agent finishes a task (status → completed)
  - Agent needs input (status → waiting)
  - Agent encounters error (status → error)
- In-app notification panel (slide-in from right)
- Notification badge on session tab
- Visual glow effect on panel border (like cmux's blue ring)
- Sound notifications (configurable, can be muted)
- Click notification to jump to session

#### F1.6 Sidebar
- Session list with status indicators
- Collapsible sections:
  - Active Sessions
  - Recent Sessions
  - Workspaces
  - Plugins
- Session metadata preview (model, tokens, cost, git branch)
- Sidebar position: left (default), right, bottom, or hidden
- Resizable width

#### F1.7 Toolbar / Command Bar
- Quick-action buttons (configurable)
- Default buttons: New Session, Split, Layout Preset, Settings
- Plugin-added buttons
- Command palette (Ctrl+P) — search all actions, settings, sessions
- Toolbar position: top (default) or bottom

#### F1.8 Basic Settings UI
- Theme selection (dark/light, accent color)
- Font configuration
- Keybinding editor
- Session defaults (shell, working directory, environment variables)
- Notification preferences
- Import/Export settings as JSON

#### F1.9 Workspace Presets
- Built-in presets (Focus, Dual, Monitor, Command Center)
- Save current layout as preset
- Load preset
- Import/Export presets as JSON files

#### F1.10 Window Customization
- Frameless window with custom title bar
- Title bar position: top, bottom, left, right, hidden
- Window opacity (transparency)
- Always-on-top toggle
- Remember window position and size per workspace

---

### Phase 2: Polish & Advanced Features

#### F2.1 Liquid Animations
- **Gooey merge effect** — SVG filter (feGaussianBlur + feColorMatrix) when panels dock
- **Spring physics** — panels bounce/snap with spring dynamics (Framer Motion)
- **Fluid tear** — stretchy animation when detaching panels
- **Ripple effect** — click feedback on interactive elements
- **Performance mode** — toggle to disable all physics animations
- **Animation speed** — configurable (0x = instant, 1x = normal, 2x = slow-mo demo)

#### F2.2 Block-Based Output (inspired by Warp)
- Each command + output rendered as a discrete visual block
- Blocks have:
  - Command text header
  - Collapsible output body
  - Execution time, exit code, timestamp
  - Color coding (red for errors)
- Click to select a block, copy command or output separately
- Filter within a block (regex search)
- Sticky command header when scrolling long output

#### F2.3 Inter-Session Communication
- Message bus connecting all sessions
- Session A can send text/data to Session B's input
- Shared clipboard between sessions
- Cross-reference: `@sessionA.lastOutput` syntax
- Broadcast messages to all sessions
- Message history panel

#### F2.4 Cost & Usage Dashboard
- Real-time token usage per session
- Cost calculation by model and provider
- Aggregated daily/weekly/monthly cost charts
- Cost alerts (configurable thresholds)
- Export usage data as CSV/JSON
- Dashboard as a dockable panel

#### F2.5 Triggers (inspired by iTerm2)
- Regex patterns matched against terminal output
- Actions on match:
  - Highlight text with custom color
  - Send notification
  - Run a command
  - Play sound
  - Log to file
- Per-session or global triggers
- Enable/disable per trigger

#### F2.6 Custom Window Shapes
- Frameless + transparent window
- CSS clip-path for custom shapes
- Built-in shapes: rounded rectangle, circle, pill
- Custom SVG path support
- Easter egg / demo feature
- Shape affects hit-test region for clicks/drag

#### F2.7 Session Persistence & Resurrection
- Save session state on close:
  - Panel layout and positions
  - Scrollback content
  - Working directories
  - Session metadata
- Resurrect sessions on relaunch
- Auto-save every N minutes (configurable)

#### F2.8 Quick Terminal (Quake Mode)
- Global hotkey summons Molten from top of screen
- Slide-down animation
- Dismiss with same hotkey or Escape
- Configurable: slide from top/bottom/left/right
- Configurable height/width percentage

#### F2.9 Contextual Keybinding Hints
- Bottom bar shows available keybindings for current context
- Mode-based: changes based on what's focused
- Toggle visibility (show for beginners, hide for power users)
- Keybinding cheat sheet (Ctrl+?)

#### F2.10 Git Integration
- Show current branch per session in sidebar
- Changed files indicator
- Quick commit/push buttons (optional plugin)

---

### Phase 3: Ecosystem & Community

#### F3.1 Plugin System
- Plugins are npm packages
- Plugin API exposes:
  - Panel registration (custom widget types)
  - Event hooks (session events, UI events)
  - Sidebar item registration
  - Toolbar button registration
  - Settings page registration
  - Theme registration
  - Keybinding registration
  - Inter-session message bus access
  - Session metadata read/write
- Plugin lifecycle: install, enable, disable, uninstall
- Hot-reload during development
- Plugin settings UI (auto-generated from schema)
- Plugin isolation (sandboxed iframes for UI, message-passing for API)

#### F3.2 Plugin Marketplace
- Browse community plugins from within Molten
- Categories: Widgets, Themes, Integrations, Automations
- Install with one click
- Star/review system
- Plugin registry (GitHub-based or hosted)

#### F3.3 Theme Engine
- CSS custom properties for all colors
- Theme file format (JSON or CSS)
- Built-in themes:
  - **Obsidian** — dark with purple/blue accents (default, Dark Glassmorphism)
  - **Arctic** — light with blue accents
  - **Ember** — dark with orange/red accents
  - **Neon** — dark with vibrant neon colors
- Glassmorphism effects: backdrop-filter blur, transparency, border glow
- Community themes via plugin system

#### F3.4 Preset Marketplace
- Share workspace layouts as presets
- Download community presets
- Preview before installing

#### F3.5 CLI Tool (`molten`)
- `molten` — launch Molten
- `molten open <path>` — open with working directory
- `molten session new` — create new session
- `molten session list` — list active sessions
- `molten session send <id> <text>` — send text to session
- `molten notify <title> <body>` — send notification
- `molten preset <name>` — load preset
- `molten plugin install <name>` — install plugin

#### F3.6 Socket API
- Local socket (Unix socket / named pipe on Windows)
- JSON request/response protocol
- Full programmatic control of all Molten features
- Enables integration with external tools, scripts, hooks
- Claude Code hooks can communicate with Molten via socket

---

## 4. Technical Architecture

### 4.1 Stack

| Layer | Technology | Purpose |
|---|---|---|
| **App Shell** | Tauri 2 | Native window, system tray, file access, PTY management |
| **Backend** | Rust (Tauri) | PTY spawning, process management, socket server, file I/O |
| **Frontend** | React 18 + TypeScript | UI rendering, state management, plugin host |
| **Terminal** | xterm.js + WebGL addon | Terminal emulation and rendering |
| **Styling** | Tailwind CSS + CSS Modules | Theming, glassmorphism effects |
| **State** | Zustand | Lightweight reactive state management |
| **Docking** | rc-dock or FlexLayout | Drag-and-drop docking system |
| **Animations** | Framer Motion + SVG filters | Fluid physics, gooey effects |
| **Physics** | Matter.js (optional plugin) | Advanced physics interactions |
| **Build** | Vite | Fast dev server and bundling |
| **Package** | pnpm | Dependency management |

### 4.2 Process Architecture

```
┌─────────────────────────────────────────┐
│              Tauri (Rust)               │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ PTY #1  │ │ PTY #2  │ │ PTY #N   │  │
│  │(claude) │ │(claude) │ │(bash)    │  │
│  └────┬────┘ └────┬────┘ └────┬─────┘  │
│       │           │           │         │
│  ┌────┴───────────┴───────────┴─────┐   │
│  │       PTY Manager (Rust)         │   │
│  └────────────────┬─────────────────┘   │
│                   │ IPC                 │
│  ┌────────────────┴─────────────────┐   │
│  │      Socket Server (Rust)        │   │
│  └──────────────────────────────────┘   │
├─────────────────────────────────────────┤
│            WebView (Frontend)           │
│  ┌──────────────────────────────────┐   │
│  │         React App                │   │
│  │  ┌────────┐ ┌────────┐          │   │
│  │  │xterm.js│ │xterm.js│  ...     │   │
│  │  │Session1│ │Session2│          │   │
│  │  └────────┘ └────────┘          │   │
│  │  ┌──────────────────────┐       │   │
│  │  │   Docking Engine     │       │   │
│  │  └──────────────────────┘       │   │
│  │  ┌──────────────────────┐       │   │
│  │  │   Plugin Host        │       │   │
│  │  └──────────────────────┘       │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 4.3 Plugin Architecture

```
┌─────────────────────────────────────┐
│           Plugin Registry           │
│  (npm packages / local directories) │
└──────────────┬──────────────────────┘
               │ load
┌──────────────┴──────────────────────┐
│           Plugin Host               │
│  ┌─────────────────────────────┐    │
│  │    Plugin API (TypeScript)  │    │
│  │  - registerPanel()          │    │
│  │  - registerToolbarButton()  │    │
│  │  - onSessionEvent()         │    │
│  │  - sendToSession()          │    │
│  │  - getSessionMetadata()     │    │
│  │  - registerTheme()          │    │
│  │  - registerKeybinding()     │    │
│  │  - showNotification()       │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │   Plugin Sandbox (iframe)   │    │
│  │   - Isolated DOM            │    │
│  │   - Message passing only    │    │
│  │   - No direct DOM access    │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### 4.4 Event System

All components communicate via a central event bus:

```
SessionCreated, SessionClosed, SessionStatusChanged
PanelDocked, PanelUndocked, PanelSplit, PanelMerged
WorkspaceLoaded, WorkspaceSaved
PluginLoaded, PluginUnloaded
NotificationReceived, NotificationRead
TerminalOutput, TerminalInput
CostUpdated, TokensUpdated
TriggerMatched
KeybindingPressed
ThemeChanged
```

Plugins can subscribe to any event and emit custom events.

---

## 5. Design Language

### 5.1 Visual Identity

**Style:** Dark Glassmorphism (2026 trend)

- **Background:** Deep dark (#0a0a0f) with subtle gradient overlays
- **Panels:** Semi-transparent (#1a1a2e at 80% opacity) with backdrop-filter blur (12px)
- **Borders:** 1px solid rgba(255, 255, 255, 0.08) with subtle glow on hover
- **Accent:** Configurable, default electric purple (#7c3aed) / cyan (#06b6d4) gradient
- **Text:** Primary (#e2e8f0), secondary (#94a3b8), muted (#475569)
- **Status colors:** Blue (thinking), Orange (waiting), Gray (idle), Red (error), Green (completed)
- **Shadows:** Layered box-shadows with color tint matching accent
- **Animations:** Smooth spring physics (stiffness: 300, damping: 30)

### 5.2 Typography

- **UI Font:** Inter (system fallback: -apple-system, Segoe UI)
- **Terminal Font:** JetBrains Mono (fallback: Cascadia Code, Menlo, Consolas)
- **Sizes:** 12px (small), 13px (body), 14px (heading), 16px (title)

### 5.3 Iconography

- Lucide icons (open source, consistent style)
- 20px default size
- Stroke width: 1.5px

### 5.4 Spacing

- Base unit: 4px
- Panel padding: 12px
- Panel gap: 2px (when docked)
- Border radius: 8px (panels), 6px (buttons), 4px (inputs)

### 5.5 Motion Design

| Interaction | Animation | Duration |
|---|---|---|
| Panel dock/merge | Gooey blob effect | 400ms |
| Panel undock/tear | Stretch + snap spring | 350ms |
| Panel resize | Immediate (no animation) | 0ms |
| Sidebar toggle | Slide + fade | 200ms |
| Notification appear | Slide in + bounce | 300ms |
| Status change | Color fade | 200ms |
| Quick terminal | Slide down + blur | 250ms |
| Theme switch | Cross-fade | 300ms |

---

## 6. Competitive Positioning

### 6.1 vs cmux
- cmux: macOS only, no plugin system, no physics animations
- Molten: Cross-platform, plugin-first, liquid UI

### 6.2 vs Claude Squad
- Claude Squad: tmux-based TUI, no GUI, macOS/Linux only
- Molten: Full GUI, native Windows, visual docking

### 6.3 vs Agent Deck
- Agent Deck: tmux TUI, smart status detection, MCP pooling
- Molten: GUI + status detection + docking + plugins

### 6.4 vs Claudia
- Claudia: Tauri desktop app, Y Combinator backed, no plugin system
- Molten: Plugin-first architecture, liquid docking, community presets

### 6.5 vs Warp
- Warp: Proprietary, AI-focused terminal emulator, paid features
- Molten: Open source, AI agent wrapper (not full terminal), free forever

---

## 7. Development Roadmap

### Phase 1 — MVP (Foundation)
- [ ] Tauri 2 project scaffold
- [ ] xterm.js terminal rendering with ConPTY/PTY
- [ ] Multi-session management (create, switch, close)
- [ ] Basic docking system (split, tab, resize)
- [ ] Session status detection
- [ ] Sidebar with session list
- [ ] Basic notification system (desktop + in-app)
- [ ] Settings UI
- [ ] Built-in presets (Focus, Dual, Monitor)
- [ ] Frameless window with custom title bar
- [ ] Windows + macOS + Linux builds

### Phase 2 — Polish
- [ ] Gooey merge/tear animations
- [ ] Block-based output mode
- [ ] Inter-session message bus
- [ ] Cost & usage dashboard
- [ ] Triggers system
- [ ] Session persistence & resurrection
- [ ] Quick terminal (Quake mode)
- [ ] Keybinding hints bar
- [ ] Window shape customization
- [ ] Panel detach to separate OS window

### Phase 3 — Ecosystem
- [ ] Plugin API (TypeScript SDK)
- [ ] Plugin loading & lifecycle management
- [ ] Theme engine
- [ ] Plugin marketplace UI
- [ ] Preset marketplace
- [ ] CLI tool (`molten`)
- [ ] Socket API
- [ ] Documentation website
- [ ] Example plugins (cost tracker, git widget, file preview)

---

## 8. File Structure

```
molten/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── pty.rs          # PTY management
│   │   ├── session.rs      # Session lifecycle
│   │   ├── socket.rs       # Socket API server
│   │   └── commands.rs     # Tauri IPC commands
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                    # React frontend
│   ├── components/
│   │   ├── Terminal/       # xterm.js wrapper
│   │   ├── Dock/           # Docking system
│   │   ├── Sidebar/        # Session sidebar
│   │   ├── Toolbar/        # Top toolbar
│   │   ├── StatusBar/      # Bottom status
│   │   ├── Notification/   # Notification panel
│   │   ├── Settings/       # Settings UI
│   │   └── CommandPalette/ # Ctrl+P palette
│   ├── plugins/            # Plugin host
│   │   ├── api.ts          # Plugin API definition
│   │   ├── loader.ts       # Plugin loader
│   │   └── sandbox.ts      # Plugin sandbox
│   ├── stores/             # Zustand stores
│   │   ├── session.ts
│   │   ├── workspace.ts
│   │   ├── notification.ts
│   │   └── settings.ts
│   ├── themes/             # Built-in themes
│   │   ├── obsidian.css
│   │   ├── arctic.css
│   │   ├── ember.css
│   │   └── neon.css
│   ├── hooks/              # React hooks
│   ├── utils/              # Utilities
│   ├── types/              # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── plugins/                # Example plugins
│   ├── cost-tracker/
│   ├── git-widget/
│   └── file-preview/
├── docs/
│   ├── SPEC.md             # This file
│   ├── ARCHITECTURE.md
│   └── PLUGIN-API.md
├── public/                 # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md
```

---

## 9. Success Metrics

- **GitHub Stars:** 1,000 within 3 months of launch
- **Plugin count:** 10+ community plugins within 6 months
- **Platform support:** Windows, macOS, Linux from day one
- **Performance:** <100ms cold start, <16ms frame time (60fps animations)
- **Bundle size:** <20MB installer

---

## 10. Open Questions

1. **License:** MIT (current) — permissive enough for plugin ecosystem?
2. **Plugin isolation:** iframe sandbox vs web worker vs same-context? Trade-off between security and API richness.
3. **Terminal backend:** xterm.js is the safe choice. Should we evaluate alternatives (e.g., terminal-kit, blessed)?
4. **Preset format:** JSON vs YAML vs KDL (like Zellij)?
5. **Physics engine:** Framer Motion springs vs Matter.js full physics? Performance implications?
6. **i18n:** When to add internationalization? Phase 1 or later?
