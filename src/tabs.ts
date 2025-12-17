// Tab Manager for Retro IDE
// Manages multiple open file tabs with dirty state tracking

export interface Tab {
  id: string;
  filePath: string;
  filename: string;
  isDirty: boolean;
  type: "text" | "image" | "base";
}

export interface TabManager {
  tabs: Tab[];
  activeTabId: string | null;
  onTabChange: ((tab: Tab | null) => void) | null;
  onTabClose: ((tab: Tab) => boolean) | null;
  onTabsChange: (() => void) | null;
}

// Global tab state
const tabManager: TabManager = {
  tabs: [],
  activeTabId: null,
  onTabChange: null,
  onTabClose: null,
  onTabsChange: null,
};

// Generate unique tab ID from file path
function generateTabId(filePath: string): string {
  return `tab-${filePath.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

// Initialize tab manager with callbacks
export function initTabManager(options: {
  onTabChange?: (tab: Tab | null) => void;
  onTabClose?: (tab: Tab) => boolean;
  onTabsChange?: () => void;
}): void {
  tabManager.onTabChange = options.onTabChange ?? null;
  tabManager.onTabClose = options.onTabClose ?? null;
  tabManager.onTabsChange = options.onTabsChange ?? null;
}

// Open or activate a tab
export function openTab(filePath: string, filename: string, type: "text" | "image" | "base"): Tab {
  const id = generateTabId(filePath);
  
  // Check if tab already exists
  const existingTab = tabManager.tabs.find(t => t.id === id);
  if (existingTab) {
    activateTab(id);
    return existingTab;
  }
  
  // Create new tab
  const tab: Tab = {
    id,
    filePath,
    filename,
    isDirty: false,
    type,
  };
  
  tabManager.tabs.push(tab);
  activateTab(id);
  tabManager.onTabsChange?.();
  
  return tab;
}

// Activate a tab by ID
export function activateTab(id: string): void {
  const tab = tabManager.tabs.find(t => t.id === id);
  if (tab && tabManager.activeTabId !== id) {
    tabManager.activeTabId = id;
    tabManager.onTabChange?.(tab);
    tabManager.onTabsChange?.();
  }
}

// Close a tab by ID
export function closeTab(id: string): boolean {
  const tabIndex = tabManager.tabs.findIndex(t => t.id === id);
  if (tabIndex === -1) return false;
  
  const tab = tabManager.tabs[tabIndex];
  
  // Check if close is allowed (e.g., for unsaved changes confirmation)
  if (tabManager.onTabClose && !tabManager.onTabClose(tab)) {
    return false;
  }
  
  // Remove the tab
  tabManager.tabs.splice(tabIndex, 1);
  
  // If this was the active tab, activate another
  if (tabManager.activeTabId === id) {
    if (tabManager.tabs.length > 0) {
      // Activate the tab at the same position, or the last one
      const newIndex = Math.min(tabIndex, tabManager.tabs.length - 1);
      tabManager.activeTabId = tabManager.tabs[newIndex].id;
      tabManager.onTabChange?.(tabManager.tabs[newIndex]);
    } else {
      tabManager.activeTabId = null;
      tabManager.onTabChange?.(null);
    }
  }
  
  tabManager.onTabsChange?.();
  return true;
}

// Close all tabs
export function closeAllTabs(): void {
  // Close tabs from end to start to avoid index issues
  while (tabManager.tabs.length > 0) {
    const tab = tabManager.tabs[tabManager.tabs.length - 1];
    if (!closeTab(tab.id)) {
      // If a tab refuses to close, stop
      break;
    }
  }
}

// Get active tab
export function getActiveTab(): Tab | null {
  if (!tabManager.activeTabId) return null;
  return tabManager.tabs.find(t => t.id === tabManager.activeTabId) ?? null;
}

// Get all tabs
export function getAllTabs(): Tab[] {
  return [...tabManager.tabs];
}

// Get tab by file path
export function getTabByPath(filePath: string): Tab | null {
  const id = generateTabId(filePath);
  return tabManager.tabs.find(t => t.id === id) ?? null;
}

// Mark a tab as dirty
export function setTabDirty(filePath: string, isDirty: boolean): void {
  const tab = getTabByPath(filePath);
  if (tab && tab.isDirty !== isDirty) {
    tab.isDirty = isDirty;
    tabManager.onTabsChange?.();
  }
}

// Check if any tab is dirty
export function hasUnsavedTabs(): boolean {
  return tabManager.tabs.some(t => t.isDirty);
}

// Get active tab ID
export function getActiveTabId(): string | null {
  return tabManager.activeTabId;
}

// Render tabs to the tab bar element
export function renderTabs(container: HTMLElement): void {
  container.innerHTML = "";
  
  for (const tab of tabManager.tabs) {
    const tabEl = document.createElement("div");
    tabEl.className = `tab ${tab.id === tabManager.activeTabId ? "active" : ""} ${tab.isDirty ? "dirty" : ""}`;
    tabEl.dataset.tabId = tab.id;
    
    const nameEl = document.createElement("span");
    nameEl.className = "tab-name";
    nameEl.textContent = tab.filename;
    tabEl.appendChild(nameEl);
    
    // Dirty indicator
    if (tab.isDirty) {
      const dirtyEl = document.createElement("span");
      dirtyEl.className = "tab-dirty";
      dirtyEl.textContent = "*";
      tabEl.appendChild(dirtyEl);
    }
    
    // Close button
    const closeEl = document.createElement("button");
    closeEl.className = "tab-close";
    closeEl.textContent = "×";
    closeEl.title = "Close";
    closeEl.addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    tabEl.appendChild(closeEl);
    
    // Click to activate
    tabEl.addEventListener("click", () => {
      activateTab(tab.id);
    });
    
    container.appendChild(tabEl);
  }
}
