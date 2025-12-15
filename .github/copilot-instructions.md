# Copilot Instructions for Retro IDE

## Project Overview

Retro IDE is a **Tauri v2** desktop application for retro computer development. It uses a dual-stack architecture:
- **Frontend**: Vanilla TypeScript + Vite (no framework) → served at `http://localhost:1420`
- **Backend**: Rust (Tauri) → handles native desktop capabilities

Currently a minimal scaffold with sidebar + main content layout.

## Architecture

```
src/                    # Frontend (TypeScript)
├── main.ts            # App initialization
├── styles.css         # CSS variables theme system (dark theme)
src-tauri/             # Backend (Rust)
├── src/lib.rs         # Tauri app bootstrap (mobile-compatible entry)
├── src/main.rs        # Desktop entry point (calls lib::run())
├── Cargo.toml         # Rust dependencies
├── tauri.conf.json    # Tauri config (window, bundling, CSP)
└── capabilities/      # Tauri v2 permission system
```

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
- `--bg-primary`, `--bg-secondary`, `--bg-sidebar`
- `--text-primary`, `--text-secondary`
- `--border-color`, `--accent-color`

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
