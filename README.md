# Retro IDE

A desktop IDE for retro computer development, built with Tauri v2 and CodeMirror 6.

## Current Features

### Project Management
- **Open/Close Projects**: File → Open Project (Cmd/Ctrl+O) to select a project folder
- **File Tree**: Browse project files with expandable folders and file icons
- **Last Project Memory**: Automatically reopens the last project on launch
- **Tab System**: Multiple open files with dirty state tracking

### Code Editor
Built on CodeMirror 6 with:
- Syntax highlighting for multiple languages
- Line numbers and active line highlighting
- Code folding
- Bracket matching and auto-close
- Search and replace (Cmd/Ctrl+F)
- Undo/Redo history
- Auto-completion
- Dark theme with retro-inspired colors

### Language Support

| Language      | Extensions               | Notes                                           |
| ------------- | ------------------------ | ----------------------------------------------- |
| 6502 Assembly | `.asm`, `.s`, `.inc`     | MOS 6502 + 65C02 opcodes                        |
| 6809 Assembly | `.asm`, `.s`, `.inc`     | MC6809 + HD6309 opcodes                         |
| BASIC         | `.bas`                   | MS BASIC, Extended Color BASIC, Commodore BASIC |
| C/C++         | `.c`, `.h`, `.cpp`, etc. | Via @codemirror/lang-cpp                        |
| Python        | `.py`                    | Via @codemirror/lang-python                     |
| Markdown      | `.md`                    | With code block syntax highlighting             |
| Shell         | `.sh`, `.bash`, `.zsh`   | Via legacy mode                                 |

### Project Modes
Switch between target platforms (click the mode icon in sidebar):
- **Commodore 64**: 6502 assembly + Commodore BASIC V2
- **TRS-80 Color Computer**: 6809 assembly + Extended Color BASIC

The active project mode determines which assembly and BASIC dialects are used for syntax highlighting.

### File Support
- **Text files**: Full editor with syntax highlighting
- **Images**: PNG, JPG, GIF, WebP, BMP, ICO, SVG (view only)
- **Binary files**: Displays informational message

## Development Setup

### Prerequisites

1. **Rust** (latest stable)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Node.js** (v18 or later)

3. **Platform-specific dependencies**

   **macOS:**
   ```bash
   xcode-select --install
   ```

   **Linux (Debian/Ubuntu):**
   ```bash
   sudo apt update
   sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
   ```

   **Windows:**
   - Microsoft Visual Studio C++ Build Tools
   - WebView2 (usually pre-installed on Windows 10/11)

### Running

```bash
npm install
npm run tauri dev
```

### Building

```bash
npm run tauri build
```

Output goes to `src-tauri/target/release/bundle/`.

## Architecture

```
src/                    # Frontend (TypeScript)
├── main.ts            # App initialization, menu handling
├── tabs.ts            # Tab manager for open files
├── projectMode.ts     # C64/CoCo platform selection
├── styles.css         # CSS variables theme system
└── editor/            # CodeMirror 6 integration
    ├── index.ts       # Editor wrapper, language detection
    ├── theme.ts       # CSS variable bridge for theming
    └── languages/     # Custom syntax modes (6502, 6809, BASIC)

src-tauri/             # Backend (Rust)
├── src/lib.rs         # Tauri commands (file I/O, dialogs)
├── src/main.rs        # Desktop entry point
└── capabilities/      # Tauri v2 permission system
```

## CI/CD

- **ci.yml**: Runs on pull requests. Checks TypeScript and Rust compile, runs clippy and tests.
- **release.yml**: Runs on version tags (`v*`). Builds for Windows, macOS (arm64 + x64), and Linux. Creates GitHub releases with binaries.

## License

MIT
