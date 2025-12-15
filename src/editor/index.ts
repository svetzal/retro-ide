// CodeMirror Editor Wrapper
// Main editor integration for Retro IDE

import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from "@codemirror/view";
import { EditorState, Extension } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo, selectAll } from "@codemirror/commands";
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { markdown } from "@codemirror/lang-markdown";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";

import { retroThemeExtension } from "./theme";
import { asm6502 } from "./languages/asm6502";
import { asm6809 } from "./languages/asm6809";
import { basic } from "./languages/basic";

// Language detection based on file extension
export type LanguageMode = 
  | "asm6502" 
  | "asm6809" 
  | "basic" 
  | "basic-ecb"      // Extended Color BASIC
  | "basic-cbm"      // Commodore BASIC
  | "c" 
  | "cpp" 
  | "python"
  | "shell"
  | "markdown"
  | "text";

// File extension to language mapping
const extensionToLanguage: Record<string, LanguageMode> = {
  // 6502 Assembly
  "asm": "asm6502",
  "a65": "asm6502",
  "s65": "asm6502",
  "65s": "asm6502",
  
  // 6809 Assembly  
  "a09": "asm6809",
  "s09": "asm6809",
  "09s": "asm6809",
  "s19": "asm6809",
  
  // Generic assembly (default to 6502)
  "s": "asm6502",
  "inc": "asm6502",
  
  // BASIC variants
  "bas": "basic",
  "basic": "basic",
  "ecb": "basic-ecb",     // Extended Color BASIC
  "coco": "basic-ecb",    // CoCo BASIC
  "cbm": "basic-cbm",     // Commodore BASIC
  "prg": "basic-cbm",     // C64 program (often BASIC)
  
  // C/C++
  "c": "c",
  "h": "c",
  "cpp": "cpp",
  "cxx": "cpp",
  "cc": "cpp",
  "hpp": "cpp",
  "hxx": "cpp",
  
  // Python
  "py": "python",
  "pyw": "python",
  "pyi": "python",
  
  // Shell scripts
  "sh": "shell",
  "bash": "shell",
  "zsh": "shell",
  "fish": "shell",
  "ksh": "shell",
  
  // Markdown
  "md": "markdown",
  "markdown": "markdown",
  
  // Plain text
  "txt": "text",
  "json": "text",
  "yaml": "text",
  "yml": "text",
  "toml": "text",
  "cfg": "text",
  "ini": "text",
};

// Get language mode from filename
export function detectLanguage(filename: string): LanguageMode {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return extensionToLanguage[ext] ?? "text";
}

// Get language extension for CodeMirror
function getLanguageExtension(mode: LanguageMode): Extension {
  switch (mode) {
    case "asm6502":
      return asm6502();
    case "asm6809":
      return asm6809();
    case "basic":
    case "basic-ecb":
    case "basic-cbm":
      return basic();
    case "c":
    case "cpp":
      return cpp();
    case "python":
      return python();
    case "shell":
      return StreamLanguage.define(shell);
    case "markdown":
      return markdown();
    case "text":
    default:
      return [];
  }
}

// Language mode display names
export function getLanguageDisplayName(mode: LanguageMode): string {
  const names: Record<LanguageMode, string> = {
    "asm6502": "6502 Assembly",
    "asm6809": "6809 Assembly",
    "basic": "BASIC",
    "basic-ecb": "Extended Color BASIC",
    "basic-cbm": "Commodore BASIC",
    "c": "C",
    "cpp": "C++",
    "python": "Python",
    "shell": "Shell Script",
    "markdown": "Markdown",
    "text": "Plain Text",
  };
  return names[mode];
}

// Editor instance manager
export interface EditorInstance {
  view: EditorView;
  language: LanguageMode;
  filePath: string;
  isDirty: boolean;
  destroy: () => void;
}

// Active editor reference
let activeEditor: EditorInstance | null = null;

// Callback for content changes
let onContentChange: ((isDirty: boolean) => void) | null = null;

// Create base extensions that are common to all editors
function createBaseExtensions(onSave?: () => void): Extension[] {
  const extensions: Extension[] = [
    // Line numbers and gutter
    lineNumbers(),
    highlightActiveLineGutter(),
    foldGutter(),
    
    // Selection and cursor
    highlightSpecialChars(),
    drawSelection(),
    dropCursor(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    
    // Editing features
    history(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    
    // Theme
    ...retroThemeExtension,
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    
    // Keymaps
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),
  ];

  // Add save keymap if callback provided
  if (onSave) {
    extensions.push(
      keymap.of([
        {
          key: "Mod-s",
          run: () => {
            onSave();
            return true;
          },
        },
      ])
    );
  }

  return extensions;
}

// Create a new editor instance
export function createEditor(
  container: HTMLElement,
  content: string,
  filePath: string,
  options?: {
    onSave?: () => void;
    onChange?: (isDirty: boolean) => void;
    readOnly?: boolean;
  }
): EditorInstance {
  // Destroy existing editor if any
  if (activeEditor) {
    activeEditor.destroy();
  }

  const filename = filePath.split("/").pop() ?? filePath;
  const language = detectLanguage(filename);
  
  // Track original content for dirty detection
  const originalContent = content;
  let isDirty = false;

  // Store change callback
  onContentChange = options?.onChange ?? null;

  // Create extensions
  const extensions: Extension[] = [
    ...createBaseExtensions(options?.onSave),
    getLanguageExtension(language),
  ];

  // Add read-only if specified
  if (options?.readOnly) {
    extensions.push(EditorState.readOnly.of(true));
  }

  // Add change listener
  extensions.push(
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const currentContent = update.state.doc.toString();
        const newIsDirty = currentContent !== originalContent;
        
        if (newIsDirty !== isDirty) {
          isDirty = newIsDirty;
          if (activeEditor) {
            activeEditor.isDirty = isDirty;
          }
          onContentChange?.(isDirty);
        }
      }
    })
  );

  // Create editor state
  const state = EditorState.create({
    doc: content,
    extensions,
  });

  // Create editor view
  const view = new EditorView({
    state,
    parent: container,
  });

  // Create instance
  const instance: EditorInstance = {
    view,
    language,
    filePath,
    isDirty: false,
    destroy: () => {
      view.destroy();
      if (activeEditor === instance) {
        activeEditor = null;
      }
    },
  };

  activeEditor = instance;
  return instance;
}

// Get current editor content
export function getEditorContent(): string | null {
  return activeEditor?.view.state.doc.toString() ?? null;
}

// Get active editor instance
export function getActiveEditor(): EditorInstance | null {
  return activeEditor;
}

// Mark editor as clean (after save)
export function markEditorClean(): void {
  if (activeEditor) {
    activeEditor.isDirty = false;
    onContentChange?.(false);
  }
}

// Set editor content (replace all)
export function setEditorContent(content: string): void {
  if (activeEditor) {
    const { view } = activeEditor;
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: content,
      },
    });
  }
}

// Focus the editor
export function focusEditor(): void {
  activeEditor?.view.focus();
}

// Edit operations - expose CodeMirror commands for menu integration

export function editorUndo(): boolean {
  if (!activeEditor) return false;
  return undo(activeEditor.view);
}

export function editorRedo(): boolean {
  if (!activeEditor) return false;
  return redo(activeEditor.view);
}

export function editorSelectAll(): boolean {
  if (!activeEditor) return false;
  return selectAll(activeEditor.view);
}

export async function editorCut(): Promise<boolean> {
  if (!activeEditor) return false;
  const view = activeEditor.view;
  const selection = view.state.sliceDoc(
    view.state.selection.main.from,
    view.state.selection.main.to
  );
  if (selection) {
    await navigator.clipboard.writeText(selection);
    view.dispatch(view.state.replaceSelection(""));
    return true;
  }
  return false;
}

export async function editorCopy(): Promise<boolean> {
  if (!activeEditor) return false;
  const view = activeEditor.view;
  const selection = view.state.sliceDoc(
    view.state.selection.main.from,
    view.state.selection.main.to
  );
  if (selection) {
    await navigator.clipboard.writeText(selection);
    return true;
  }
  return false;
}

export async function editorPaste(): Promise<boolean> {
  if (!activeEditor) return false;
  const view = activeEditor.view;
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      view.dispatch(view.state.replaceSelection(text));
      return true;
    }
  } catch (e) {
    console.error("Failed to paste:", e);
  }
  return false;
}

// Check if editor has an active selection
export function hasSelection(): boolean {
  if (!activeEditor) return false;
  const selection = activeEditor.view.state.selection.main;
  return selection.from !== selection.to;
}
