// Retro IDE - Main Entry Point
// This file initializes the application

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

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

  try {
    const content = await invoke<string>("read_file_contents", { path: entry.path });
    displayFileContent(entry.name, content);

    // Highlight selected file in tree
    document.querySelectorAll(".file-tree-row.selected").forEach(el => {
      el.classList.remove("selected");
    });
    const row = document.querySelector(`.file-tree-row[data-path="${CSS.escape(entry.path)}"]`);
    if (row) {
      row.classList.add("selected");
    }
  } catch (error) {
    console.error("Failed to open file:", error);
    displayFileContent(entry.name, `Error: Failed to read file\n${error}`);
  }
}

function displayFileContent(filename: string, content: string): void {
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="file-viewer">
      <div class="file-viewer-header">
        <span class="file-viewer-filename">${escapeHtml(filename)}</span>
      </div>
      <div class="file-viewer-content">
        <pre><code>${escapeHtml(content)}</code></pre>
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
  // Listen for menu events from the native menu
  await listen("menu-open-project", () => {
    openProject();
  });

  await listen("menu-close-project", () => {
    closeProject();
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
