# Agents Instructions for Retro IDE

## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**
```bash
bd ready --json
```

**Create new issues:**
```bash
bd create "Issue title" -t bug|feature|task -p 0-4 --json
bd create "Issue title" -p 1 --deps discovered-from:bd-123 --json
bd create "Subtask" --parent <epic-id> --json  # Hierarchical subtask (gets ID like epic-id.1)
```

**Claim and update:**
```bash
bd update bd-42 --status in_progress --json
bd update bd-42 --priority 1 --json
```

**Complete work:**
```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`
6. **Commit together**: Always commit the `.beads/issues.jsonl` file together with the code changes so issue state stays in sync with code state

### Auto-Sync

bd automatically syncs with git:
- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### MCP Server (Recommended)

If using Claude or MCP-compatible clients, install the beads MCP server:

```bash
pip install beads-mcp
```

Add to MCP config (e.g., `~/.config/claude/config.json`):
```json
{
  "beads": {
    "command": "beads-mcp",
    "args": []
  }
}
```

Then use `mcp__beads__*` functions instead of CLI commands.

### Managing AI-Generated Planning Documents

AI assistants often create planning and design documents during development:
- PLAN.md, IMPLEMENTATION.md, ARCHITECTURE.md
- DESIGN.md, CODEBASE_SUMMARY.md, INTEGRATION_PLAN.md
- TESTING_GUIDE.md, TECHNICAL_DESIGN.md, and similar files

**Best Practice: Use a dedicated directory for these ephemeral files**

**Recommended approach:**
- Create a `history/` directory in the project root
- Store ALL AI-generated planning/design docs in `history/`
- Keep the repository root clean and focused on permanent project files
- Only access `history/` when explicitly asked to review past planning

**Example .gitignore entry (optional):**
```
# AI planning documents (ephemeral)
history/
```

**Benefits:**
- ✅ Clean repository root
- ✅ Clear separation between ephemeral and permanent documentation
- ✅ Easy to exclude from version control if desired
- ✅ Preserves planning history for archeological research
- ✅ Reduces noise when browsing the project

### CLI Help

Run `bd <command> --help` to see all available flags for any command.
For example: `bd create --help` shows `--parent`, `--deps`, `--assignee`, etc.

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ✅ Store AI planning docs in `history/` directory
- ✅ Run `bd <cmd> --help` to discover available flags
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems
- ❌ Do NOT clutter repo root with planning documents

For more details, see README.md and QUICKSTART.md.

## Project Overview

Retro IDE is a **Tauri v2** desktop application for retro computer development. It uses a dual-stack architecture:
- **Frontend**: Vanilla TypeScript + Vite (no framework) → served at `http://localhost:1420`
- **Backend**: Rust (Tauri) → handles native desktop capabilities

Currently a minimal scaffold with sidebar + main content layout.

## Architecture

```
src/                    # Frontend (TypeScript)
├── main.ts            # App initialization, menu event handling
├── styles.css         # CSS variables theme system (dark theme)
├── editor/            # CodeMirror 6 integration
│   ├── index.ts       # Editor wrapper, language detection, edit commands
│   ├── theme.ts       # CSS variable bridge for CodeMirror theming
│   └── languages/     # Custom syntax highlighting modes
│       ├── asm6502.ts       # 6502/65C02 assembly
│       ├── asm6502-parser.ts
│       ├── asm6809.ts       # 6809/6309 assembly
│       └── basic.ts         # BASIC (MS BASIC, ECB, Commodore)
src-tauri/             # Backend (Rust)
├── src/lib.rs         # Tauri app bootstrap (mobile-compatible entry)
├── src/main.rs        # Desktop entry point (calls lib::run())
├── Cargo.toml         # Rust dependencies
├── tauri.conf.json    # Tauri config (window, bundling, CSP)
└── capabilities/      # Tauri v2 permission system
```

## CodeMirror 6 Integration

The editor is built on **CodeMirror 6**, a modular text editor framework. Key design decisions:

### Installed Packages
```json
{
  "@codemirror/view": "Editor view and DOM integration",
  "@codemirror/state": "Editor state management",
  "@codemirror/commands": "Basic editing commands (undo, redo, etc.)",
  "@codemirror/language": "Syntax highlighting infrastructure",
  "@codemirror/lang-cpp": "C/C++ language support",
  "@codemirror/lang-python": "Python language support",
  "@codemirror/legacy-modes": "Legacy CodeMirror 5 modes (shell, etc.)",
  "@codemirror/autocomplete": "Auto-completion framework",
  "@codemirror/search": "Search and replace functionality",
  "@lezer/highlight": "Syntax highlighting tags",
  "@lezer/lr": "LR parser infrastructure"
}
```

### Enabled Extensions
In [src/editor/index.ts](src/editor/index.ts), the editor is configured with:
- `lineNumbers()` - Line number gutter
- `highlightActiveLineGutter()` - Highlights current line in gutter
- `highlightActiveLine()` - Highlights current line in editor
- `foldGutter()` - Code folding markers
- `highlightSpecialChars()` - Shows invisible characters
- `drawSelection()` - Selection highlighting
- `dropCursor()` - Cursor position indicator for drag/drop
- `rectangularSelection()` - Alt+drag rectangular selection
- `crosshairCursor()` - Cursor crosshair on Alt
- `highlightSelectionMatches()` - Highlights matching selections
- `history()` - Undo/redo support
- `indentOnInput()` - Auto-indent
- `bracketMatching()` - Bracket pair highlighting
- `closeBrackets()` - Auto-close brackets and quotes
- `autocompletion()` - Basic autocomplete

### Keymaps
- `defaultKeymap` - Standard editing keys
- `historyKeymap` - Undo (Cmd/Ctrl+Z), Redo (Cmd/Ctrl+Shift+Z)
- `searchKeymap` - Find (Cmd/Ctrl+F), Replace (Cmd/Ctrl+H)
- `foldKeymap` - Code folding shortcuts
- `completionKeymap` - Autocomplete navigation
- `closeBracketsKeymap` - Bracket handling
- `indentWithTab` - Tab key for indentation

### Custom Language Modes
Located in `src/editor/languages/`, these use CodeMirror's `StreamLanguage` for simpler token-based parsing:

| Language      | File         | Supported Features                                                      |
| ------------- | ------------ | ----------------------------------------------------------------------- |
| 6502 Assembly | `asm6502.ts` | MOS 6502 + 65C02 opcodes, common assembler directives, labels, comments |
| 6809 Assembly | `asm6809.ts` | MC6809 + HD6309 opcodes, LWASM/AS9 directives, labels                   |
| BASIC         | `basic.ts`   | MS BASIC, Extended Color BASIC, Commodore BASIC keywords                |

### File Extension Mapping
Language detection in `detectLanguage()`:
- **6502**: `.asm`, `.a65`, `.s65`, `.65s`, `.s`, `.inc`
- **6809**: `.a09`, `.s09`, `.09s`, `.s19`
- **BASIC**: `.bas`, `.basic`, `.ecb`, `.coco`, `.cbm`, `.prg`
- **C/C++**: `.c`, `.h`, `.cpp`, `.cxx`, `.cc`, `.hpp`, `.hxx`
- **Python**: `.py`, `.pyw`, `.pyi`
- **Shell**: `.sh`, `.bash`, `.zsh`, `.fish`, `.ksh`

### Theme Integration
[src/editor/theme.ts](src/editor/theme.ts) maps CSS custom properties to CodeMirror:
- Uses `EditorView.theme()` for structural styling
- Uses `HighlightStyle.define()` for syntax colors
- All colors reference CSS variables from [src/styles.css](src/styles.css)

### Adding New Languages
1. Create `src/editor/languages/mylang.ts`
2. Use `StreamLanguage.define()` with a tokenizer function
3. Export a `LanguageSupport` factory function
4. Add extension mapping in `src/editor/index.ts`
5. Export from `src/editor/languages/index.ts`

## Key Development Commands

```bash
npm run tauri dev      # Start dev mode (frontend + backend hot-reload)
npm run tauri build    # Production build → src-tauri/target/release/bundle/
npm run check          # TypeScript type checking only
```

## Critical Patterns

### Tauri v2 Command Pattern
When adding Rust backend commands, register them in [src-tauri/src/lib.rs](src-tauri/src/lib.rs):
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![your_command])  // Add commands here
    .run(tauri::generate_context!())
```

### Tauri v2 Permissions
New commands/plugins require capability declarations in [src-tauri/capabilities/default.json](src-tauri/capabilities/default.json). Current permissions: `core:default`, `shell:allow-open`.

### CSS Theme Variables
Use CSS custom properties from [src/styles.css](src/styles.css) for consistent styling:
- `--bg-primary`, `--bg-secondary`, `--bg-sidebar`, `--bg-tertiary`
- `--text-primary`, `--text-secondary`
- `--border-color`, `--accent-color`

**Syntax Highlighting Variables** (used by CodeMirror theme):
- `--syntax-comment`, `--syntax-string`, `--syntax-number`
- `--syntax-keyword`, `--syntax-operator`, `--syntax-function`
- `--syntax-variable`, `--syntax-type`, `--syntax-label`
- `--syntax-macro`, `--syntax-instruction`, `--syntax-register`
- `--syntax-error`

**Editor-specific Variables**:
- `--selection-bg`, `--bracket-match-bg`
- `--search-match-bg`, `--search-match-selected-bg`

### Native Menus
Menus are defined in Rust ([src-tauri/src/lib.rs](src-tauri/src/lib.rs)) and emit events to the frontend:

**Retro IDE Menu** (macOS app menu):
- About Retro IDE
- Quit (Cmd+Q)

**File Menu**:
- Open Project (Cmd/Ctrl+O) → `menu-open-project`
- Close Project → `menu-close-project`
- Save (Cmd/Ctrl+S) → `menu-save-file`

**Edit Menu**:
- Undo (Cmd/Ctrl+Z) → `menu-undo`
- Redo (Cmd/Ctrl+Shift+Z) → `menu-redo`
- Cut (Cmd/Ctrl+X) → `menu-cut`
- Copy (Cmd/Ctrl+C) → `menu-copy`
- Paste (Cmd/Ctrl+V) → `menu-paste`
- Select All (Cmd/Ctrl+A) → `menu-select-all`

Menu events are handled in [src/main.ts](src/main.ts) `setupMenuListeners()` and call editor functions from [src/editor/index.ts](src/editor/index.ts).

### No Frontend Framework
This project intentionally uses vanilla TypeScript without React/Vue/Svelte. Keep frontend code framework-free unless explicitly discussed.

## CI/CD Requirements

- **TypeScript**: Must pass `npm run check` (strict mode, no unused variables)
- **Rust**: Must pass `cargo clippy -- -D warnings` (warnings are errors)
- **Tests**: `cargo test` runs in CI

Linux builds require: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

## Build Artifacts

Release binaries bundle to:
- macOS: `.app`, `.dmg`
- Windows: `.msi`, `.exe`
- Linux: `.deb`, `.AppImage`

## Release Process

### Version Locations
Version must be updated in **three places** (keep them in sync):
- `package.json` → `"version": "X.Y.Z"`
- `src-tauri/tauri.conf.json` → `"version": "X.Y.Z"`
- `src-tauri/Cargo.toml` → `version = "X.Y.Z"`

### Creating a Release

1. **Update version numbers** in all three files above
2. **Commit the version bump**: `git commit -am "Bump version to vX.Y.Z"`
3. **Create and push the tag**:
   ```bash
   git tag vX.Y.Z
   git push origin main --tags
   ```
4. **GitHub Actions** automatically:
   - Builds for macOS (arm64 + x64), Linux, and Windows
   - Creates a **draft GitHub release** with binaries attached
5. **Publish the release** on GitHub (edit draft, add release notes, publish)

### Release Types (Semantic Versioning)

| Type  | When to use                                      | Example         |
|-------|--------------------------------------------------|-----------------|
| Patch | Bug fixes, minor tweaks, no new features         | 0.1.0 → 0.1.1   |
| Minor | New features, backward-compatible changes        | 0.1.0 → 0.2.0   |
| Major | Breaking changes, major rewrites                 | 0.1.0 → 1.0.0   |

### Quick Commands for Agents

**Patch release** (e.g., 0.1.0 → 0.1.1):
```bash
# Update versions in package.json, tauri.conf.json, Cargo.toml
git commit -am "Bump version to v0.1.1"
git tag v0.1.1
git push origin main --tags
```

### Pre-Release Quality Checks

Before creating a release tag, ensure:
- [ ] `npm run check` passes (TypeScript)
- [ ] `cargo clippy -- -D warnings` passes (Rust lints)
- [ ] `cargo test` passes (Rust tests)
- [ ] App runs successfully with `npm run tauri dev`

*(Additional quality checks will be added as the project matures)*
