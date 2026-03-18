import { useMemo, useCallback, useRef } from 'react';
import RcDockLayout, { TabData, LayoutData, PanelData } from 'rc-dock';
import 'rc-dock/dist/rc-dock-dark.css';
import { TerminalPanel } from '../Terminal';
import { useSessionStore } from '../../stores/sessionStore';
import './DockLayout.css';

export function DockContainer() {
  const layoutRef = useRef<RcDockLayout>(null);
  const { sessions, activeSessionId, setActiveSession, closeSession } = useSessionStore();

  const sessionList = Array.from(sessions.values());

  // Build layout from session store
  const layout = useMemo((): LayoutData => {
    const tabs: TabData[] = sessionList.map((session) => ({
      id: session.id,
      title: session.name,
      closable: true,
      content: <TerminalPanel sessionId={session.id} />,
      group: 'terminal',
    }));

    if (tabs.length === 0) {
      return { dockbox: { mode: 'horizontal', children: [] } };
    }

    // Check if rc-dock already has a layout with panels — preserve it
    const currentLayout = layoutRef.current?.getLayout();
    if (currentLayout && hasTabsInLayout(currentLayout)) {
      // Update existing layout: add new tabs, remove closed ones
      return updateLayoutTabs(currentLayout, tabs, activeSessionId);
    }

    // First time: create a single panel with all tabs
    return {
      dockbox: {
        mode: 'horizontal',
        children: [
          {
            id: 'main-panel',
            tabs,
            activeId: activeSessionId || tabs[0]?.id,
          } as PanelData,
        ],
      },
    };
  }, [sessionList, activeSessionId]);

  // Load tab when rc-dock needs to recreate
  const loadTab = useCallback(
    (data: TabData): TabData => {
      const session = sessions.get(data.id as string);
      if (session) {
        return {
          id: session.id,
          title: session.name,
          closable: true,
          content: <TerminalPanel sessionId={session.id} />,
          group: 'terminal',
        };
      }
      return {
        ...data,
        content: <div style={{ color: '#666', padding: 20 }}>Session ended</div>,
      };
    },
    [sessions]
  );

  const handleLayoutChange = useCallback(
    (_newLayout: LayoutData, currentTabId?: string, direction?: string) => {
      if (currentTabId && direction === 'active') {
        setActiveSession(currentTabId);
      }
      // When a tab is closed via rc-dock X button, close the session
      if (currentTabId && direction === 'remove') {
        closeSession(currentTabId);
      }
    },
    [setActiveSession, closeSession]
  );

  return (
    <RcDockLayout
      ref={layoutRef}
      layout={layout}
      groups={{
        terminal: {
          floatable: true,
          maximizable: true,
          animated: false,
        },
      }}
      onLayoutChange={handleLayoutChange}
      loadTab={loadTab}
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}

// Helper: check if layout has any tabs
function hasTabsInLayout(layout: LayoutData): boolean {
  return countTabsInBox(layout.dockbox) > 0;
}

function countTabsInBox(box: any): number {
  if (!box) return 0;
  if (box.tabs) return box.tabs.length;
  if (box.children) {
    return box.children.reduce((sum: number, child: any) => sum + countTabsInBox(child), 0);
  }
  return 0;
}

// Helper: update existing layout with new/removed tabs
function updateLayoutTabs(
  currentLayout: LayoutData,
  newTabs: TabData[],
  _activeId: string | null
): LayoutData {
  const newTabIds = new Set(newTabs.map((t) => t.id as string));
  const existingTabIds = new Set<string>();

  // Collect existing tab IDs
  collectTabIds(currentLayout.dockbox, existingTabIds);

  // Find tabs to add (in newTabs but not in existing)
  const tabsToAdd = newTabs.filter((t) => !existingTabIds.has(t.id as string));

  // If there are tabs to add, we need to add them to a panel
  if (tabsToAdd.length > 0) {
    // Clone the layout and add new tabs to the first panel found
    const cloned = JSON.parse(JSON.stringify(currentLayout));
    const firstPanel = findFirstPanel(cloned.dockbox);
    if (firstPanel) {
      for (const tab of tabsToAdd) {
        firstPanel.tabs.push({ id: tab.id, title: tab.title, closable: true, group: 'terminal' });
        firstPanel.activeId = tab.id;
      }
    }
    return cloned;
  }

  // Remove tabs that no longer exist
  const cloned = JSON.parse(JSON.stringify(currentLayout));
  removeTabsNotIn(cloned.dockbox, newTabIds);

  return cloned;
}

function collectTabIds(box: any, ids: Set<string>): void {
  if (!box) return;
  if (box.tabs) {
    for (const tab of box.tabs) {
      ids.add(tab.id);
    }
  }
  if (box.children) {
    for (const child of box.children) {
      collectTabIds(child, ids);
    }
  }
}

function findFirstPanel(box: any): any {
  if (!box) return null;
  if (box.tabs) return box;
  if (box.children) {
    for (const child of box.children) {
      const found = findFirstPanel(child);
      if (found) return found;
    }
  }
  return null;
}

function removeTabsNotIn(box: any, validIds: Set<string>): void {
  if (!box) return;
  if (box.tabs) {
    box.tabs = box.tabs.filter((t: any) => validIds.has(t.id));
  }
  if (box.children) {
    for (const child of box.children) {
      removeTabsNotIn(child, validIds);
    }
    // Remove empty children
    box.children = box.children.filter((child: any) => {
      if (child.tabs) return child.tabs.length > 0;
      if (child.children) return child.children.length > 0;
      return false;
    });
  }
}
