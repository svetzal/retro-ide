# Retro IDE

A desktop application scaffold built with Tauri v2. Currently does nothing useful.

## Current State

This is a bare-bones starting point for what might eventually become an IDE for retro computer development. Right now it displays:
- A 200px sidebar that says "File Tree Here"
- A main area that says "Hello, Retro World!"

That's it.

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

## CI/CD

- **ci.yml**: Runs on pull requests. Checks TypeScript and Rust compile, runs clippy and tests.
- **release.yml**: Runs on pushes to main and version tags. Builds for Windows, macOS, and Linux. Creates GitHub releases on `v*` tags.

## License

MIT
