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
} from "./editor";

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
let mainContent: HTMLElement | null;

// State
let expandedFolders: Set<string> = new Set();

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

  // Reset main content to welcome screen when project changes
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
  if (!mainContent) return;

  // Highlight selected file in tree
  document.querySelectorAll(".file-tree-row.selected").forEach(el => {
    el.classList.remove("selected");
  });
  const row = document.querySelector(`.file-tree-row[data-path="${CSS.escape(entry.path)}"]`);
  if (row) {
    row.classList.add("selected");
  }

  const editorType = getEditorType(entry.name);

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
  if (!mainContent) return;

  const ext = entry.name.split(".").pop()?.toLowerCase() ?? "unknown";
  
  mainContent.innerHTML = `
    <div class="editor-container base-editor">
      <div class="editor-header">
        <span class="editor-filename">${escapeHtml(entry.name)}</span>
        <span class="editor-type-badge">Unknown Type</span>
      </div>
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
  if (!mainContent) return;

  const content = await invoke<string>("read_file_contents", { path: entry.path });
  const language = detectLanguage(entry.name);
  const languageName = getLanguageDisplayName(language);
  
  // Create container structure
  mainContent.innerHTML = `
    <div class="editor-container text-editor">
      <div class="editor-header">
        <span class="editor-filename" id="editor-filename">${escapeHtml(entry.name)}</span>
        <span class="editor-type-badge">${escapeHtml(languageName)}</span>
      </div>
      <div class="editor-content" id="codemirror-container">
      </div>
    </div>
  `;
  
  const container = document.getElementById("codemirror-container");
  const filenameEl = document.getElementById("editor-filename");
  
  if (!container) return;
  
  // Create CodeMirror editor
  createEditor(container, content, entry.path, {
    onSave: async () => {
      await saveCurrentFile(entry.path);
    },
    onChange: (isDirty) => {
      if (filenameEl) {
        if (isDirty) {
          filenameEl.classList.add("dirty");
        } else {
          filenameEl.classList.remove("dirty");
        }
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
    console.log("File saved:", path);
  } catch (error) {
    console.error("Failed to save file:", error);
    // TODO: Show error notification to user
  }
}

// Image Editor - displays image files
async function openImageEditor(entry: FileEntry): Promise<void> {
  if (!mainContent) return;

  const fileData = await invoke<FileData>("read_file_binary", { path: entry.path });
  const dataUrl = `data:${fileData.mime_type};base64,${fileData.data}`;
  
  mainContent.innerHTML = `
    <div class="editor-container image-editor">
      <div class="editor-header">
        <span class="editor-filename">${escapeHtml(entry.name)}</span>
        <span class="editor-type-badge">Image</span>
      </div>
      <div class="editor-content centered">
        <div class="image-viewer">
          <img src="${dataUrl}" alt="${escapeHtml(entry.name)}" />
        </div>
      </div>
    </div>
  `;
}

// Error display
function displayError(filename: string, message: string): void {
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="editor-container error-view">
      <div class="editor-header">
        <span class="editor-filename">${escapeHtml(filename)}</span>
        <span class="editor-type-badge error">Error</span>
      </div>
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
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="welcome-screen">
      <h1>Retro IDE</h1>
      <p>Select a file from the sidebar to view its contents</p>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function setupEventListeners(): void {
  // Open Project button in sidebar
  const openProjectBtn = document.getElementById("open-project-btn");
  if (openProjectBtn) {
    openProjectBtn.addEventListener("click", openProject);
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
  mainContent = document.querySelector(".main-content");

  // Setup event listeners
  setupEventListeners();
  await setupMenuListeners();

  // Try to load the last opened project
  await loadLastProject();
});
