# Retro IDE

A desktop IDE for retro computer development, built with Tauri v2.

## Overview

Retro IDE is a cross-platform desktop application designed to provide a modern development environment for retro computer programming (8-bit systems, assembly language, etc.). This is currently a placeholder/foundation project with basic UI scaffolding.

## Features (Planned)

- File tree browser for project navigation
- Code editor with syntax highlighting for assembly languages
- Built-in assemblers for various retro platforms
- Emulator integration for testing
- Cross-platform: Windows, macOS, and Linux

## Development Setup

### Prerequisites

1. **Rust** (latest stable)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Node.js** (v18 or later)
   - Download from [nodejs.org](https://nodejs.org/) or use a version manager like `nvm`

3. **Tauri CLI**
   ```bash
   cargo install tauri-cli
   ```

4. **Platform-specific dependencies**

   **macOS:**
   - Xcode Command Line Tools: `xcode-select --install`

   **Linux (Debian/Ubuntu):**
   ```bash
   sudo apt update
   sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
   ```

   **Windows:**
   - Microsoft Visual Studio C++ Build Tools
   - WebView2 (usually pre-installed on Windows 10/11)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/retro-ide.git
   cd retro-ide
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate app icons (first time only):
   ```bash
   npm run tauri icon src-tauri/icons/app-icon.png
   ```
   Note: You'll need to provide a source icon image (1024x1024 PNG recommended).

### Running in Development Mode

```bash
npm run tauri dev
```

This starts both the Vite dev server (for hot reload) and the Tauri application.

### Building for Production

```bash
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Project Structure

```
retro-ide/
├── src/                    # Frontend source (TypeScript, CSS)
│   ├── main.ts            # Main entry point
│   └── styles.css         # Application styles
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs        # Rust entry point
│   │   └── lib.rs         # Tauri application setup
│   ├── capabilities/      # Tauri v2 permissions
│   ├── icons/             # Application icons
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── .github/workflows/     # CI/CD pipelines
│   ├── ci.yml            # Pull request checks
│   └── release.yml       # Release builds
└── index.html             # Main HTML template
```

## CI/CD

### Continuous Integration (`ci.yml`)

Triggered on pull requests and pushes to `main`:
- Runs TypeScript type checking
- Runs `cargo check`, `cargo clippy`, and `cargo test`
- Builds the app (without packaging) on all platforms

### Release Workflow (`release.yml`)

Triggered on pushes to `main` and version tags (`v*`):
- Builds release binaries for all platforms
- For tag pushes: Creates a GitHub Release with attached binaries
- For main pushes: Uploads artifacts for testing

**Creating a Release:**
```bash
git tag v0.1.0
git push origin v0.1.0
```

### Build Artifacts

| Platform | Artifact Types |
|----------|---------------|
| Windows  | MSI installer, NSIS installer |
| macOS    | DMG (both Intel and Apple Silicon) |
| Linux    | AppImage, .deb package |

## Target Platforms

- **Windows** 10/11 (64-bit)
- **macOS** 10.13+ (Intel and Apple Silicon)
- **Linux** (64-bit, glibc-based distributions)

## License

MIT License - see LICENSE file for details.
