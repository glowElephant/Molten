# Molten — Plugin API Reference

> Build extensions that add panels, buttons, themes, and automations to Molten.

## Quick Start

### 1. Create a plugin

```bash
mkdir molten-plugin-hello && cd molten-plugin-hello
npm init -y
npm install @molten/plugin-api --save-dev
```

### 2. Define plugin metadata

**package.json:**
```json
{
  "name": "molten-plugin-hello",
  "version": "1.0.0",
  "description": "A hello world plugin for Molten",
  "main": "dist/index.js",
  "molten": {
    "displayName": "Hello World",
    "description": "Adds a greeting panel",
    "icon": "./icon.svg",
    "minMoltenVersion": "1.0.0",
    "permissions": []
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

### 3. Write the plugin

**src/index.ts:**
```typescript
import type { MoltenPlugin, PluginContext } from '@molten/plugin-api';

const plugin: MoltenPlugin = {
  activate(ctx: PluginContext) {
    ctx.registerPanel('hello-panel', {
      title: 'Hello',
      component: () => import('./HelloPanel'),
      icon: 'smile',
      defaultPosition: 'bottom',
    });

    ctx.registerToolbarButton({
      icon: 'smile',
      tooltip: 'Show Hello Panel',
      onClick: () => ctx.togglePanel('hello-panel'),
    });
  },

  deactivate() {
    // Cleanup resources
  },
};

export default plugin;
```

### 4. Install locally

```bash
# From Molten settings or CLI:
molten plugin install /path/to/molten-plugin-hello
```

---

## API Reference

### MoltenPlugin

The main interface your plugin must export as default.

```typescript
interface MoltenPlugin {
  /**
   * Called when the plugin is activated.
   * Register panels, buttons, event handlers, etc.
   */
  activate(ctx: PluginContext): void | Promise<void>;

  /**
   * Called when the plugin is deactivated or Molten is closing.
   * Clean up any resources, timers, or subscriptions.
   */
  deactivate(): void | Promise<void>;
}
```

---

### PluginContext

The context object passed to `activate()`. This is your plugin's gateway to Molten.

#### Panels

```typescript
/**
 * Register a new panel type that can be docked anywhere.
 */
registerPanel(id: string, config: PanelConfig): void;

interface PanelConfig {
  /** Display title in the panel header / tab */
  title: string;

  /** Dynamic import of the React component */
  component: () => Promise<{ default: React.ComponentType }>;

  /** Lucide icon name */
  icon: string;

  /** Where the panel appears by default when first opened */
  defaultPosition: 'left' | 'right' | 'top' | 'bottom' | 'float';

  /** Optional default size */
  defaultSize?: { width: number; height: number };
}

/**
 * Show a registered panel (add to current layout if not visible).
 */
showPanel(id: string): void;

/**
 * Hide a panel (remove from layout but don't destroy).
 */
hidePanel(id: string): void;

/**
 * Toggle panel visibility.
 */
togglePanel(id: string): void;
```

#### Toolbar

```typescript
/**
 * Add a button to the main toolbar.
 */
registerToolbarButton(config: ToolbarButtonConfig): void;

interface ToolbarButtonConfig {
  /** Lucide icon name */
  icon: string;

  /** Tooltip text on hover */
  tooltip: string;

  /** Click handler */
  onClick: () => void;

  /** Optional: button group for dropdown */
  group?: string;

  /** Optional: show text label next to icon */
  label?: string;
}
```

#### Sidebar

```typescript
/**
 * Add an item to the sidebar.
 */
registerSidebarItem(config: SidebarItemConfig): void;

interface SidebarItemConfig {
  /** Unique ID */
  id: string;

  /** Display label */
  label: string;

  /** Lucide icon name */
  icon: string;

  /** Click handler */
  onClick: () => void;

  /** Optional badge (e.g., unread count) */
  badge?: number | string;

  /** Section to place in */
  section?: 'top' | 'bottom';
}
```

#### Events

```typescript
/**
 * Subscribe to Molten events.
 */
on<E extends keyof MoltenEvents>(
  event: E,
  handler: (data: MoltenEvents[E]) => void
): Unsubscribe;

/**
 * Emit a custom plugin event.
 * Other plugins can listen via onBroadcast().
 */
emit(event: string, data: unknown): void;

/** Available built-in events */
type MoltenEvents = {
  'session:created': { sessionId: string; name: string };
  'session:closed': { sessionId: string };
  'session:status-changed': {
    sessionId: string;
    oldStatus: SessionStatus;
    newStatus: SessionStatus;
  };
  'session:output': { sessionId: string; data: string };
  'session:input': { sessionId: string; data: string };
  'panel:docked': { panelId: string; position: DockPosition };
  'panel:undocked': { panelId: string };
  'panel:focused': { panelId: string };
  'notification:received': { id: string; title: string; body: string };
  'workspace:loaded': { name: string };
  'workspace:saved': { name: string };
  'theme:changed': { theme: string };
  'trigger:matched': {
    triggerId: string;
    sessionId: string;
    match: RegExpMatchArray;
  };
};

type Unsubscribe = () => void;
```

#### Sessions

```typescript
/**
 * Get all active sessions.
 */
getSessions(): SessionInfo[];

/**
 * Get metadata for a specific session.
 */
getSessionMetadata(sessionId: string): SessionMetadata;

/**
 * Send text input to a session's terminal.
 */
sendToSession(sessionId: string, text: string): void;

/**
 * Get recent output from a session.
 * @param lines Number of recent lines to retrieve (default: 100)
 */
getSessionOutput(sessionId: string, lines?: number): string[];

interface SessionInfo {
  id: string;
  name: string;
  status: SessionStatus;
  agentType: AgentType | null;
  createdAt: string; // ISO 8601
}

interface SessionMetadata {
  model: string | null;
  tokensUsed: number;
  costUsd: number;
  gitBranch: string | null;
  workingDir: string;
}

type SessionStatus = 'thinking' | 'waiting' | 'idle' | 'error' | 'completed';
type AgentType = 'claude_code' | 'codex' | 'gemini_cli' | 'aider' | 'opencode' | 'unknown';
```

#### Notifications

```typescript
/**
 * Show a notification to the user.
 */
showNotification(config: NotificationConfig): string; // returns notification ID

interface NotificationConfig {
  /** Notification title */
  title: string;

  /** Notification body text */
  body: string;

  /** Lucide icon name (default: 'bell') */
  icon?: string;

  /** Auto-dismiss after N milliseconds (0 = persistent) */
  duration?: number;

  /** Also show as OS desktop notification */
  desktop?: boolean;

  /** Action buttons */
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  onClick: () => void;
}
```

#### Settings

```typescript
/**
 * Register plugin-specific settings.
 * These appear in Settings > Plugins > [Your Plugin].
 * Schema auto-generates the settings UI.
 */
registerSettings(schema: SettingsSchema): void;

/**
 * Get a plugin setting value.
 */
getSetting<T>(key: string): T;

/**
 * Listen for setting changes.
 */
onSettingChanged(key: string, handler: (value: unknown) => void): Unsubscribe;

type SettingsSchema = Record<string, SettingField>;

interface SettingField {
  type: 'string' | 'number' | 'boolean' | 'select' | 'color';
  label?: string;
  description?: string;
  default?: unknown;
  options?: string[]; // for 'select' type
  min?: number;       // for 'number' type
  max?: number;       // for 'number' type
}
```

#### Keybindings

```typescript
/**
 * Register a keyboard shortcut.
 */
registerKeybinding(config: KeybindingConfig): void;

interface KeybindingConfig {
  /** Key combination (e.g., "ctrl+shift+c") */
  keys: string;

  /** Action to perform */
  handler: () => void;

  /** Description shown in keybinding hints */
  description: string;

  /** When is this keybinding active? */
  when?: 'always' | 'panel-focused' | 'terminal-focused';
}
```

#### Themes

```typescript
/**
 * Register a custom theme.
 */
registerTheme(config: ThemeConfig): void;

interface ThemeConfig {
  /** Theme ID (unique) */
  id: string;

  /** Display name */
  name: string;

  /** CSS custom properties */
  colors: Record<string, string>;

  /** Optional: terminal-specific colors (xterm.js theme) */
  terminalColors?: {
    background: string;
    foreground: string;
    cursor: string;
    selection: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    // ... bright variants
  };
}
```

#### Storage

```typescript
/**
 * Persistent key-value storage scoped to your plugin.
 * Data survives app restarts.
 */
storage: {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
};
```

#### Inter-Plugin Communication

```typescript
/**
 * Broadcast a message to all plugins.
 */
broadcast(channel: string, data: unknown): void;

/**
 * Listen for broadcasts from other plugins.
 */
onBroadcast(channel: string, handler: (data: unknown, senderId: string) => void): Unsubscribe;
```

---

## Permissions

Plugins declare required permissions in `package.json`. Users are prompted to approve on install.

| Permission | Description |
|---|---|
| `session:read` | Read session list, metadata, and output |
| `session:write` | Send input to sessions |
| `notification:write` | Show notifications |
| `storage:read` | Read plugin storage |
| `storage:write` | Write plugin storage |
| `keybinding:register` | Register keyboard shortcuts |
| `theme:register` | Register themes |
| `toolbar:modify` | Add toolbar buttons |
| `sidebar:modify` | Add sidebar items |
| `network:fetch` | Make HTTP requests (future) |

---

## Example Plugins

### Cost Tracker

Monitors token usage and cost across all sessions.

```typescript
const plugin: MoltenPlugin = {
  activate(ctx: PluginContext) {
    const costs = new Map<string, number>();

    ctx.registerPanel('cost-dashboard', {
      title: 'Costs',
      component: () => import('./CostDashboard'),
      icon: 'dollar-sign',
      defaultPosition: 'bottom',
    });

    ctx.on('session:output', ({ sessionId, data }) => {
      const usage = parseTokenUsage(data);
      if (usage) {
        const current = costs.get(sessionId) || 0;
        costs.set(sessionId, current + usage.cost);
        ctx.emit('cost:updated', { sessionId, total: costs.get(sessionId) });

        const threshold = ctx.getSetting<number>('alertThreshold');
        if (costs.get(sessionId)! > threshold) {
          ctx.showNotification({
            title: 'Cost Alert',
            body: `Session exceeded $${threshold}`,
            desktop: true,
          });
        }
      }
    });

    ctx.registerSettings({
      currency: { type: 'select', options: ['USD', 'EUR', 'KRW'], default: 'USD' },
      alertThreshold: { type: 'number', default: 10, min: 1, max: 1000 },
    });
  },
  deactivate() {},
};
```

### Session Bridge (Inter-Session Communication)

Enables sending messages between Claude Code sessions.

```typescript
const plugin: MoltenPlugin = {
  activate(ctx: PluginContext) {
    ctx.registerPanel('message-bus', {
      title: 'Session Bridge',
      component: () => import('./MessageBus'),
      icon: 'message-square',
      defaultPosition: 'bottom',
    });

    // Listen for @mention syntax in session output
    ctx.on('session:output', ({ sessionId, data }) => {
      const mention = data.match(/@session:(\w+)\s+(.*)/);
      if (mention) {
        const [, targetName, message] = mention;
        const sessions = ctx.getSessions();
        const target = sessions.find(s => s.name === targetName);
        if (target) {
          ctx.sendToSession(target.id, message);
          ctx.showNotification({
            title: 'Message Forwarded',
            body: `${sessionId} → ${targetName}`,
          });
        }
      }
    });
  },
  deactivate() {},
};
```

### Git Status Widget

Shows git status for each session's working directory.

```typescript
const plugin: MoltenPlugin = {
  activate(ctx: PluginContext) {
    ctx.registerSidebarItem({
      id: 'git-status',
      label: 'Git',
      icon: 'git-branch',
      section: 'bottom',
      onClick: () => ctx.togglePanel('git-panel'),
    });

    ctx.registerPanel('git-panel', {
      title: 'Git Status',
      component: () => import('./GitPanel'),
      icon: 'git-branch',
      defaultPosition: 'right',
    });
  },
  deactivate() {},
};
```

---

## Development Workflow

### Hot Reload

During development, plugins are loaded from local directories and hot-reloaded:

```bash
# Watch mode
cd my-plugin && npm run dev

# In Molten settings, add local plugin path
# Settings > Plugins > Add Local Plugin > /path/to/my-plugin
```

### Testing

```bash
# Unit tests (your plugin logic)
npm test

# Integration tests (with Molten API mock)
npm run test:integration
```

### Publishing

```bash
# Build
npm run build

# Publish to npm
npm publish

# The plugin is now discoverable in Molten's plugin marketplace
# (marketplace searches npm for packages with "molten" keyword)
```

---

## Best Practices

1. **Declare minimal permissions** — only request what you need
2. **Clean up in deactivate()** — unsubscribe event listeners, clear timers
3. **Use storage sparingly** — don't store large data; use file I/O for that
4. **Respect user settings** — check animation preferences before animating
5. **Handle errors gracefully** — don't crash the host app
6. **Follow Molten's design language** — use the same colors, fonts, spacing
7. **Provide a README** — users should understand what your plugin does
8. **Version your API usage** — specify `minMoltenVersion` accurately
