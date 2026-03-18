<p align="center">
  <img src="docs/assets/logo-placeholder.svg" alt="Molten" width="120" />
</p>

<h1 align="center">Molten</h1>

<p align="center">
  <strong>The liquid terminal for AI coding agents</strong><br/>
  Dock, split, merge, and reshape everything.
</p>

<p align="center">
  <a href="https://github.com/glowElephant/Molten/releases"><img src="https://img.shields.io/github/v/release/glowElephant/Molten?style=flat-square" alt="Release" /></a>
  <a href="https://github.com/glowElephant/Molten/blob/main/LICENSE"><img src="https://img.shields.io/github/license/glowElephant/Molten?style=flat-square" alt="License" /></a>
  <a href="https://github.com/glowElephant/Molten/stargazers"><img src="https://img.shields.io/github/stars/glowElephant/Molten?style=flat-square" alt="Stars" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square" alt="Platform" />
</p>

---

## What is Molten?

Molten is a **desktop terminal wrapper** built for managing multiple AI coding agent sessions — Claude Code, Codex, Gemini CLI, Aider, and more.

Everything in Molten is a **liquid panel** — drag to dock, tear to detach, merge like water droplets, reshape into any layout. The terminal, reimagined.

### Why Molten?

| Problem | Molten's Answer |
|---|---|
| Multi-agent tools are macOS/tmux-only | **Cross-platform** — Windows, macOS, Linux |
| Tools are single-purpose | **All-in-one** — sessions, monitoring, cost tracking, notifications |
| No extensibility | **Plugin system** — community-driven extensions |
| Fixed, boring layouts | **Liquid docking** — any panel, anywhere, any shape |
| No inter-session communication | **Session bridge** — agents can talk to each other |

---

## Features

### Liquid Docking System
Every UI element is a draggable, dockable panel. Split, merge, float, detach to separate windows — the layout is entirely yours.

- **Gooey merge animation** — panels blob together like water droplets
- **Tear-off detach** — drag a panel outside to create a new window
- **Presets** — save and share your favorite layouts
- **Custom window shapes** — circle, pill, or any SVG path (yes, really)

### Multi-Session Management
Run multiple AI coding agents side by side with full visibility.

- **Auto status detection** — thinking, waiting, idle, error, completed
- **Visual indicators** — color-coded status in sidebar and panel headers
- **Quick switching** — sidebar or keyboard shortcuts

### Smart Notifications
Never miss when an agent needs your attention.

- **Desktop notifications** when agents finish or need input
- **In-app notification panel** with full history
- **Glowing panel borders** for visual urgency
- **Configurable triggers** — regex patterns on terminal output

### Plugin System
Extend Molten with community plugins or build your own.

- **TypeScript API** — register panels, buttons, themes, keybindings
- **Event hooks** — react to session events, terminal output, status changes
- **Plugin marketplace** — discover and install with one click
- **Hot reload** — develop plugins without restarting Molten

### More
- **Command palette** (Ctrl+P) — search all actions and settings
- **Cost dashboard** — real-time token usage and cost tracking
- **Triggers** — regex-based automation on terminal output
- **Session persistence** — layouts and scrollback survive restarts
- **Quick terminal** — global hotkey summons Molten (Quake mode)
- **Keybinding hints** — contextual shortcut bar for discoverability
- **Dark Glassmorphism** — modern, beautiful default theme

---

## Installation

### Prerequisites
- [Git](https://git-scm.com/) (required for Claude Code)
- One or more AI coding agents (Claude Code, Codex, etc.)

### Download

> **Coming soon** — Molten is currently in development.

Pre-built binaries will be available for:
- **Windows** — `.msi` installer + portable `.zip`
- **macOS** — `.dmg`
- **Linux** — `.deb`, `.rpm`, `.AppImage`

### Build from Source

```bash
# Prerequisites
# - Rust (https://rustup.rs/)
# - Node.js 20+ (https://nodejs.org/)
# - pnpm (npm install -g pnpm)

git clone https://github.com/glowElephant/Molten.git
cd Molten
pnpm install
pnpm tauri dev
```

---

## Usage

### Quick Start

1. Launch Molten
2. Press `Ctrl+N` to create a new session
3. Type `claude` to start Claude Code (or any agent)
4. Press `Ctrl+D` to split the panel and create another session
5. Drag panels to rearrange your workspace

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New session |
| `Ctrl+D` | Split vertical |
| `Ctrl+Shift+D` | Split horizontal |
| `Ctrl+W` | Close session |
| `Ctrl+P` | Command palette |
| `Ctrl+,` | Settings |
| `Ctrl+Tab` | Next session |
| `Ctrl+Shift+Tab` | Previous session |
| `Ctrl+1-9` | Switch to session N |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+\`` | Quick terminal (Quake mode) |
| `Ctrl+?` | Keybinding cheat sheet |

---

## Plugins

### Featured Plugins

| Plugin | Description |
|---|---|
| `molten-plugin-cost-tracker` | Real-time token usage and cost dashboard |
| `molten-plugin-git-widget` | Git status and quick actions per session |
| `molten-plugin-file-preview` | Preview files referenced in agent output |
| `molten-plugin-session-bridge` | Inter-session messaging |

### Create Your Own

```typescript
import type { MoltenPlugin, PluginContext } from '@molten/plugin-api';

const plugin: MoltenPlugin = {
  activate(ctx: PluginContext) {
    ctx.registerToolbarButton({
      icon: 'zap',
      tooltip: 'My Custom Action',
      onClick: () => {
        ctx.showNotification({
          title: 'Hello!',
          body: 'Plugin is working!',
        });
      },
    });
  },
  deactivate() {},
};

export default plugin;
```

See the [Plugin API Reference](docs/PLUGIN-API.md) for the full API.

---

## Tech Stack

| Layer | Technology |
|---|---|
| App Shell | [Tauri 2](https://tauri.app/) |
| Backend | Rust |
| Frontend | React 18 + TypeScript |
| Terminal | [xterm.js](https://xtermjs.org/) |
| Styling | Tailwind CSS |
| State | Zustand |
| Docking | rc-dock |
| Animations | Framer Motion + SVG filters |

---

## Documentation

- [Product Specification](docs/SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Plugin API Reference](docs/PLUGIN-API.md)

---

## Contributing

Contributions are welcome! Whether it's bug fixes, new features, plugins, or documentation — we appreciate all help.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Roadmap

- [x] Product specification
- [x] Architecture design
- [x] Plugin API design
- [ ] **Phase 1** — Core (terminal, sessions, docking, notifications)
- [ ] **Phase 2** — Polish (animations, blocks, triggers, persistence)
- [ ] **Phase 3** — Ecosystem (plugins, marketplace, themes, CLI)

---

## License

[MIT](LICENSE) — use it however you want.

---

<p align="center">
  Built with Rust, React, and a lot of melting.
</p>
