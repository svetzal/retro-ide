// Retro IDE - Main Entry Point
// This file initializes the application

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface ProjectState {
  path: string | null;
  name: string | null;
}

// DOM Elements
let projectNameEl: HTMLElement | null;
let noProjectView: HTMLElement | null;
let fileTree: HTMLElement | null;

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
    if (hasProject) {
      // TODO: Populate file tree
      fileTree.textContent = `Project: ${project.path}`;
    }
  }
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

  // Setup event listeners
  setupEventListeners();
  await setupMenuListeners();

  // Try to load the last opened project
  await loadLastProject();
});
