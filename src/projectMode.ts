// Project Mode System for Retro IDE
// Determines the target computer platform and language dialects

export type ProjectMode = "c64" | "coco";

export interface ProjectModeConfig {
  id: ProjectMode;
  name: string;
  description: string;
  assemblyDialect: "asm6502" | "asm6809";
  basicDialect: "basic-cbm" | "basic-ecb";
  icon: string; // Path to mode icon
}

// Mode configurations
export const PROJECT_MODES: Record<ProjectMode, ProjectModeConfig> = {
  c64: {
    id: "c64",
    name: "Commodore 64",
    description: "MOS 6502/6510 assembly, Commodore BASIC V2",
    assemblyDialect: "asm6502",
    basicDialect: "basic-cbm",
    icon: "/images/c64-icon.png",
  },
  coco: {
    id: "coco",
    name: "TRS-80 Color Computer",
    description: "Motorola 6809 assembly, Extended Color BASIC",
    assemblyDialect: "asm6809",
    basicDialect: "basic-ecb",
    icon: "/images/coco-icon.png",
  },
};

// State
let currentMode: ProjectMode = "c64";
let onModeChange: ((mode: ProjectMode) => void) | null = null;

// Initialize project mode system
export function initProjectMode(options?: {
  onModeChange?: (mode: ProjectMode) => void;
}): void {
  onModeChange = options?.onModeChange ?? null;

  // Load saved mode from localStorage
  const savedMode = localStorage.getItem("retro-ide-project-mode");
  if (savedMode && isValidMode(savedMode)) {
    currentMode = savedMode;
  }
}

// Type guard for valid modes
function isValidMode(mode: string): mode is ProjectMode {
  return mode === "c64" || mode === "coco";
}

// Get current mode
export function getCurrentMode(): ProjectMode {
  return currentMode;
}

// Get current mode configuration
export function getCurrentModeConfig(): ProjectModeConfig {
  return PROJECT_MODES[currentMode];
}

// Set project mode
export function setProjectMode(mode: ProjectMode): void {
  if (currentMode !== mode) {
    currentMode = mode;
    localStorage.setItem("retro-ide-project-mode", mode);
    onModeChange?.(mode);
  }
}

// Toggle between modes
export function toggleProjectMode(): void {
  const newMode: ProjectMode = currentMode === "c64" ? "coco" : "c64";
  setProjectMode(newMode);
}

// Get all available modes
export function getAvailableModes(): ProjectModeConfig[] {
  return Object.values(PROJECT_MODES);
}

// Get the assembly language mode for the current project mode
export function getAssemblyDialect(): "asm6502" | "asm6809" {
  return PROJECT_MODES[currentMode].assemblyDialect;
}

// Get the BASIC dialect for the current project mode
export function getBasicDialect(): "basic-cbm" | "basic-ecb" {
  return PROJECT_MODES[currentMode].basicDialect;
}
