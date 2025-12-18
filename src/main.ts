// Retro IDE - Main Entry Point
// This file initializes the application

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  createEditor,
  getEditorContent,
  markEditorClean,
  getLanguageDisplayName,
  detectLanguage,
  editorUndo,
  editorRedo,
  editorCut,
  editorCopy,
  editorPaste,
  editorSelectAll,
  getActiveEditor,
  destroyEditor,
} from "./editor";
import {
  initTabManager,
  openTab,
  setTabDirty,
  renderTabs,
  closeAllTabs,
  Tab,
} from "./tabs";
import {
  initProjectMode,
  getCurrentModeConfig,
  toggleProjectMode,
  ProjectMode,
} from "./projectMode";

interface ProjectState {
  path: string | null;
  name: string | null;
}

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
}

interface FileData {
  data: string;
  mime_type: string;
}

// Editor types for different file kinds
enum EditorType {
  Base = "base",
  Text = "text",
  Image = "image",
}

// File extension to editor type mapping
const TEXT_EXTENSIONS = new Set([
  "txt", "md", "json", "yaml", "yml", "toml", "xml", "html", "htm", "css",
  "js", "ts", "jsx", "tsx", "rs", "py", "rb", "go", "java", "c", "cpp", "h",
  "hpp", "asm", "s", "inc", "bas", "prg", "cfg", "ini", "sh", "bash", "zsh",
  "fish", "ps1", "bat", "cmd", "makefile", "dockerfile", "gitignore",
  "gitattributes", "editorconfig", "lock", "log", "csv", "tsv", "sql",
]);

const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg",
]);

function getEditorType(filename: string): EditorType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (TEXT_EXTENSIONS.has(ext)) {
    return EditorType.Text;
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    return EditorType.Image;
  }

  // Check for extensionless files that are typically text
  const lowerName = filename.toLowerCase();
  if (["makefile", "dockerfile", "readme", "license", "changelog", "authors", "contributing"].includes(lowerName)) {
    return EditorType.Text;
  }

  return EditorType.Base;
}

// DOM Elements
let projectNameEl: HTMLElement | null;
let noProjectView: HTMLElement | null;
let fileTree: HTMLElement | null;
let editorArea: HTMLElement | null;
let tabBar: HTMLElement | null;
let modeIndicator: HTMLElement | null;
let modeIcon: HTMLImageElement | null;

// State
let expandedFolders: Set<string> = new Set();

// Editor content cache (for tab switching)
interface EditorCache {
  content: string;
  scrollTop: number;
}
const editorContentCache: Map<string, EditorCache> = new Map();

async function openProject(): Promise<void> {
  try {
    const result = await invoke<ProjectState | null>("open_project_dialog");
    if (result) {
      updateProjectUI(result);
    }
  } catch (error) {
    console.error("Failed to open project:", error);
  }
}

async function closeProject(): Promise<void> {
  try {
    await invoke("close_project");
    updateProjectUI({ path: null, name: null });
  } catch (error) {
    console.error("Failed to close project:", error);
  }
}

async function loadLastProject(): Promise<void> {
  try {
    const result = await invoke<ProjectState | null>("load_last_project");
    if (result) {
      updateProjectUI(result);
    }
  } catch (error) {
    console.error("Failed to load last project:", error);
  }
}

function updateProjectUI(project: ProjectState): void {
  const hasProject = project.path !== null && project.name !== null;

  if (projectNameEl) {
    projectNameEl.textContent = project.name ?? "No Project";
  }

  if (noProjectView) {
    noProjectView.style.display = hasProject ? "none" : "flex";
  }

  if (fileTree) {
    fileTree.style.display = hasProject ? "block" : "none";
    if (hasProject && project.path) {
      expandedFolders.clear();
      loadFileTree(project.path);
    } else {
      fileTree.innerHTML = "";
    }
  }

  // Close all tabs and reset content when project changes
  closeAllTabs();
  editorContentCache.clear();
  if (tabBar) {
    renderTabs(tabBar);
  }
  showWelcomeScreen();
}

async function loadFileTree(path: string): Promise<void> {
  if (!fileTree) return;

  try {
    const entries = await invoke<FileEntry[]>("read_directory", { path });
    fileTree.innerHTML = "";
    const ul = createFileTreeElement(entries, 0);
    fileTree.appendChild(ul);
  } catch (error) {
    console.error("Failed to load file tree:", error);
    fileTree.innerHTML = `<div class="file-tree-error">Failed to load files</div>`;
  }
}

function createFileTreeElement(entries: FileEntry[], depth: number): HTMLUListElement {
  const ul = document.createElement("ul");
  ul.className = "file-tree-list";
  if (depth > 0) {
    ul.style.paddingLeft = "16px";
  }

  for (const entry of entries) {
    const li = document.createElement("li");
    li.className = "file-tree-item";

    const row = document.createElement("div");
    row.className = `file-tree-row ${entry.is_dir ? "folder" : "file"}`;
    row.dataset.path = entry.path;

    if (entry.is_dir) {
      const isExpanded = expandedFolders.has(entry.path);

      const chevron = document.createElement("span");
      chevron.className = `file-tree-chevron ${isExpanded ? "expanded" : ""}`;
      chevron.textContent = "›";
      row.appendChild(chevron);

      const icon = document.createElement("span");
      icon.className = "file-tree-icon folder-icon";
      icon.textContent = isExpanded ? "📂" : "📁";
      row.appendChild(icon);

      const name = document.createElement("span");
      name.className = "file-tree-name";
      name.textContent = entry.name;
      row.appendChild(name);

      row.addEventListener("click", () => toggleFolder(entry, li, depth));

      li.appendChild(row);

      // If expanded and has children, show them
      if (isExpanded && entry.children) {
        const childUl = createFileTreeElement(entry.children, depth + 1);
        li.appendChild(childUl);
      }
    } else {
      const spacer = document.createElement("span");
      spacer.className = "file-tree-chevron-spacer";
      row.appendChild(spacer);

      const icon = document.createElement("span");
      icon.className = "file-tree-icon file-icon";
      icon.textContent = getFileIcon(entry.name);
      row.appendChild(icon);

      const name = document.createElement("span");
      name.className = "file-tree-name";
      name.textContent = entry.name;
      row.appendChild(name);

      row.addEventListener("click", () => openFile(entry));

      li.appendChild(row);
    }

    ul.appendChild(li);
  }

  return ul;
}

function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const iconMap: Record<string, string> = {
    ts: "📘",
    js: "📒",
    json: "📋",
    html: "🌐",
    css: "🎨",
    md: "📝",
    rs: "🦀",
    toml: "⚙️",
    txt: "📄",
    asm: "💾",
    s: "💾",
    inc: "💾",
    bas: "💻",
    prg: "💻",
  };
  return iconMap[ext] ?? "📄";
}

async function toggleFolder(entry: FileEntry, li: HTMLLIElement, depth: number): Promise<void> {
  const isExpanded = expandedFolders.has(entry.path);

  if (isExpanded) {
    // Collapse
    expandedFolders.delete(entry.path);
    const childUl = li.querySelector(":scope > ul");
    if (childUl) {
      childUl.remove();
    }
    const chevron = li.querySelector(".file-tree-chevron");
    if (chevron) {
      chevron.classList.remove("expanded");
    }
    const icon = li.querySelector(".folder-icon");
    if (icon) {
      icon.textContent = "📁";
    }
  } else {
    // Expand
    expandedFolders.add(entry.path);

    try {
      const children = await invoke<FileEntry[]>("read_directory", { path: entry.path });
      entry.children = children;

      const childUl = createFileTreeElement(children, depth + 1);
      li.appendChild(childUl);

      const chevron = li.querySelector(".file-tree-chevron");
      if (chevron) {
        chevron.classList.add("expanded");
      }
      const icon = li.querySelector(".folder-icon");
      if (icon) {
        icon.textContent = "📂";
      }
    } catch (error) {
      console.error("Failed to load folder contents:", error);
    }
  }
}

async function openFile(entry: FileEntry): Promise<void> {
  if (!editorArea) return;

  // Highlight selected file in tree
  document.querySelectorAll(".file-tree-row.selected").forEach(el => {
    el.classList.remove("selected");
  });
  const row = document.querySelector(`.file-tree-row[data-path="${CSS.escape(entry.path)}"]`);
  if (row) {
    row.classList.add("selected");
  }

  const editorType = getEditorType(entry.name);

  // Map editor type to tab type
  const tabType = editorType === EditorType.Text ? "text" 
    : editorType === EditorType.Image ? "image" 
    : "base";

  // Save current editor content before switching
  saveCurrentEditorToCache();

  // Open or activate tab
  openTab(entry.path, entry.name, tabType);

  // Re-render tabs
  if (tabBar) {
    renderTabs(tabBar);
  }

  try {
    switch (editorType) {
      case EditorType.Text:
        await openTextEditor(entry);
        break;
      case EditorType.Image:
        await openImageEditor(entry);
        break;
      case EditorType.Base:
      default:
        openBaseEditor(entry);
        break;
    }
  } catch (error) {
    console.error("Failed to open file:", error);
    displayError(entry.name, `Failed to open file: ${error}`);
  }
}

// Base Editor - shows just the filename (fallback for unknown types)
function openBaseEditor(entry: FileEntry): void {
  if (!editorArea) return;

  const ext = entry.name.split(".").pop()?.toLowerCase() ?? "unknown";

  editorArea.innerHTML = `
    <div class="editor-container base-editor">
      <div class="editor-content centered">
        <div class="file-info">
          <div class="file-icon-large">📄</div>
          <h2>${escapeHtml(entry.name)}</h2>
          <p class="file-extension">.${escapeHtml(ext)} file</p>
          <p class="file-path">${escapeHtml(entry.path)}</p>
          <p class="editor-hint">No editor available for this file type</p>
        </div>
      </div>
    </div>
  `;
}

// Text Editor - CodeMirror integration
async function openTextEditor(entry: FileEntry): Promise<void> {
  if (!editorArea) return;

  // Check if we have cached content for this file
  const cached = editorContentCache.get(entry.path);
  let content: string;
  
  if (cached) {
    content = cached.content;
  } else {
    content = await invoke<string>("read_file_contents", { path: entry.path });
  }
  
  const language = detectLanguage(entry.name);
  const languageName = getLanguageDisplayName(language);

  // Create container structure (without header - tabs show filename now)
  editorArea.innerHTML = `
    <div class="editor-container text-editor">
      <div class="editor-status-bar">
        <span class="editor-type-badge">${escapeHtml(languageName)}</span>
      </div>
      <div class="editor-content" id="codemirror-container">
      </div>
    </div>
  `;

  const container = document.getElementById("codemirror-container");

  if (!container) return;

  // Create CodeMirror editor
  createEditor(container, content, entry.path, {
    onSave: async () => {
      await saveCurrentFile(entry.path);
    },
    onChange: (isDirty) => {
      // Update tab dirty state
      setTabDirty(entry.path, isDirty);
      if (tabBar) {
        renderTabs(tabBar);
      }
    },
  });
}

// Save the current file
async function saveCurrentFile(filePath?: string): Promise<void> {
  // If no path provided, get it from the active editor
  const editor = getActiveEditor();
  const path = filePath ?? editor?.filePath;

  if (!path) {
    console.log("No file to save");
    return;
  }

  const content = getEditorContent();
  if (content === null) return;

  try {
    await invoke("write_file_contents", { path, contents: content });
    markEditorClean();
    
    // Update tab dirty state and re-render
    setTabDirty(path, false);
    if (tabBar) {
      renderTabs(tabBar);
    }
    
    // Update cache with saved content
    editorContentCache.set(path, { content, scrollTop: 0 });
    
    console.log("File saved:", path);
  } catch (error) {
    console.error("Failed to save file:", error);
    // TODO: Show error notification to user
  }
}

// Image Editor - displays image files
async function openImageEditor(entry: FileEntry): Promise<void> {
  if (!editorArea) return;

  const fileData = await invoke<FileData>("read_file_binary", { path: entry.path });
  const dataUrl = `data:${fileData.mime_type};base64,${fileData.data}`;

  editorArea.innerHTML = `
    <div class="editor-container image-editor">
      <div class="editor-content centered">
        <div class="image-viewer">
          <img src="${dataUrl}" alt="${escapeHtml(entry.name)}" />
        </div>
      </div>
    </div>
  `;
}

// Error display
function displayError(_filename: string, message: string): void {
  if (!editorArea) return;

  editorArea.innerHTML = `
    <div class="editor-container error-view">
      <div class="editor-content centered">
        <div class="error-message">
          <div class="error-icon">⚠️</div>
          <p>${escapeHtml(message)}</p>
        </div>
      </div>
    </div>
  `;
}

function showWelcomeScreen(): void {
  if (!editorArea) return;

  editorArea.innerHTML = `
    <div class="welcome-screen">
      <h1>Retro IDE</h1>
      <p>Select a file from the sidebar to view its contents</p>
    </div>
  `;
}

// Save current editor content to cache before switching tabs
function saveCurrentEditorToCache(): void {
  const editor = getActiveEditor();
  if (editor) {
    const content = getEditorContent();
    if (content !== null) {
      editorContentCache.set(editor.filePath, {
        content,
        scrollTop: 0, // Could save scroll position here
      });
    }
  }
}

// Handle tab change - reload the file content
async function handleTabChange(tab: Tab | null): Promise<void> {
  if (!tab) {
    showWelcomeScreen();
    return;
  }

  // Highlight file in tree
  document.querySelectorAll(".file-tree-row.selected").forEach(el => {
    el.classList.remove("selected");
  });
  const row = document.querySelector(`.file-tree-row[data-path="${CSS.escape(tab.filePath)}"]`);
  if (row) {
    row.classList.add("selected");
  }

  // Save current editor before switching
  saveCurrentEditorToCache();

  // Open the file based on type
  const entry: FileEntry = {
    name: tab.filename,
    path: tab.filePath,
    is_dir: false,
  };

  try {
    switch (tab.type) {
      case "text":
        await openTextEditor(entry);
        break;
      case "image":
        await openImageEditor(entry);
        break;
      case "base":
      default:
        openBaseEditor(entry);
        break;
    }
  } catch (error) {
    console.error("Failed to switch to tab:", error);
    displayError(tab.filename, `Failed to open file: ${error}`);
  }
}

// Handle tab close - check for unsaved changes
function handleTabClose(tab: Tab): boolean {
  if (tab.isDirty) {
    // For now, just warn via console. Could add a confirmation dialog.
    console.warn(`Closing tab with unsaved changes: ${tab.filename}`);
  }
  
  // Remove from cache
  editorContentCache.delete(tab.filePath);
  
  // If this was the current editor, destroy it
  const editor = getActiveEditor();
  if (editor?.filePath === tab.filePath) {
    destroyEditor();
  }
  
  return true;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Update mode indicator UI
function updateModeIndicator(): void {
  const config = getCurrentModeConfig();
  
  if (modeIcon) {
    modeIcon.src = config.icon;
    modeIcon.alt = config.name;
  }
  
  if (modeIndicator) {
    modeIndicator.title = `${config.name}\n${config.description}\nClick to change`;
  }
}

// Handle mode change - refresh editors to use new dialect
function handleModeChange(_mode: ProjectMode): void {
  updateModeIndicator();
  
  // TODO: Could refresh open editors to apply new language mode
  // For now, new files opened will use the new mode
  console.log("Project mode changed to:", getCurrentModeConfig().name);
}

function setupEventListeners(): void {
  // Open Project button in sidebar
  const openProjectBtn = document.getElementById("open-project-btn");
  if (openProjectBtn) {
    openProjectBtn.addEventListener("click", openProject);
  }
  
  // Mode indicator click to toggle
  if (modeIndicator) {
    modeIndicator.addEventListener("click", () => {
      toggleProjectMode();
    });
  }
}

async function setupMenuListeners(): Promise<void> {
  // File menu events
  await listen("menu-open-project", () => {
    openProject();
  });

  await listen("menu-close-project", () => {
    closeProject();
  });

  await listen("menu-save-file", () => {
    saveCurrentFile();
  });

  // Edit menu events
  await listen("menu-undo", () => {
    editorUndo();
  });

  await listen("menu-redo", () => {
    editorRedo();
  });

  await listen("menu-cut", () => {
    editorCut();
  });

  await listen("menu-copy", () => {
    editorCopy();
  });

  await listen("menu-paste", () => {
    editorPaste();
  });

  await listen("menu-select-all", () => {
    editorSelectAll();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Retro IDE initialized");

  // Cache DOM elements
  projectNameEl = document.getElementById("project-name");
  noProjectView = document.getElementById("no-project-view");
  fileTree = document.getElementById("file-tree");
  editorArea = document.getElementById("editor-area");
  tabBar = document.getElementById("tab-bar");
  modeIndicator = document.getElementById("mode-indicator");
  modeIcon = document.getElementById("mode-icon") as HTMLImageElement | null;

  // Initialize project mode system
  initProjectMode({
    onModeChange: handleModeChange,
  });
  updateModeIndicator();

  // Initialize tab manager
  initTabManager({
    onTabChange: (tab) => {
      handleTabChange(tab);
      if (tabBar) {
        renderTabs(tabBar);
      }
    },
    onTabClose: handleTabClose,
    onTabsChange: () => {
      if (tabBar) {
        renderTabs(tabBar);
      }
    },
  });

  // Setup event listeners
  setupEventListeners();
  await setupMenuListeners();

  // Try to load the last opened project
  await loadLastProject();
});
