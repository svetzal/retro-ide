use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{Emitter, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "settings.json";
const LAST_PROJECT_KEY: &str = "last_project_path";

#[derive(Default, Serialize, Deserialize, Clone)]
pub struct ProjectState {
    pub path: Option<String>,
    pub name: Option<String>,
}

struct AppState {
    project: Mutex<ProjectState>,
}

#[tauri::command]
fn get_current_project(state: State<AppState>) -> ProjectState {
    state.project.lock().unwrap().clone()
}

#[tauri::command]
async fn open_project_dialog(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<ProjectState>, String> {
    let folder = app
        .dialog()
        .file()
        .set_title("Open Project Folder")
        .blocking_pick_folder();

    match folder {
        Some(path) => {
            let path_str = path.to_string();
            let name = std::path::Path::new(&path_str)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| path_str.clone());

            let project = ProjectState {
                path: Some(path_str.clone()),
                name: Some(name),
            };

            // Save to persistent store
            if let Ok(store) = app.store(STORE_FILE) {
                store.set(LAST_PROJECT_KEY, serde_json::to_value(&path_str).unwrap());
                let _ = store.save();
            }

            // Update app state
            *state.project.lock().unwrap() = project.clone();

            Ok(Some(project))
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn load_last_project(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<ProjectState>, String> {
    if let Ok(store) = app.store(STORE_FILE) {
        if let Some(value) = store.get(LAST_PROJECT_KEY) {
            if let Some(path_str) = value.as_str() {
                // Verify the path still exists
                if std::path::Path::new(path_str).exists() {
                    let name = std::path::Path::new(path_str)
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_else(|| path_str.to_string());

                    let project = ProjectState {
                        path: Some(path_str.to_string()),
                        name: Some(name),
                    };

                    *state.project.lock().unwrap() = project.clone();
                    return Ok(Some(project));
                }
            }
        }
    }
    Ok(None)
}

#[tauri::command]
async fn close_project(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    // Clear persistent store
    if let Ok(store) = app.store(STORE_FILE) {
        let _ = store.delete(LAST_PROJECT_KEY);
        let _ = store.save();
    }

    // Clear app state
    *state.project.lock().unwrap() = ProjectState::default();
    Ok(())
}

#[derive(Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

#[tauri::command]
async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err("Path does not exist".to_string());
    }

    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut entries: Vec<FileEntry> = Vec::new();

    let read_dir = fs::read_dir(path).map_err(|e| e.to_string())?;

    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and common non-essential directories
        if name.starts_with('.') {
            continue;
        }

        let is_dir = entry_path.is_dir();

        entries.push(FileEntry {
            name,
            path: entry_path.to_string_lossy().to_string(),
            is_dir,
            children: None, // Children are loaded on demand
        });
    }

    // Sort: directories first, then files, both alphabetically
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

#[tauri::command]
async fn read_file_contents(path: String) -> Result<String, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    if !path.is_file() {
        return Err("Path is not a file".to_string());
    }

    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_file_contents(path: String, contents: String) -> Result<(), String> {
    let path = Path::new(&path);

    // Create parent directories if they don't exist
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    fs::write(path, contents).map_err(|e| e.to_string())
}

#[derive(Serialize, Deserialize, Clone)]
pub struct FileData {
    pub data: String,
    pub mime_type: String,
}

#[tauri::command]
async fn read_file_binary(path: String) -> Result<FileData, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};

    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err("File does not exist".to_string());
    }

    if !file_path.is_file() {
        return Err("Path is not a file".to_string());
    }

    let bytes = fs::read(file_path).map_err(|e| e.to_string())?;
    let data = STANDARD.encode(&bytes);

    // Determine MIME type from extension
    let mime_type = match file_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        Some("ico") => "image/x-icon",
        Some("svg") => "image/svg+xml",
        _ => "application/octet-stream",
    }
    .to_string();

    Ok(FileData { data, mime_type })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(AppState {
            project: Mutex::new(ProjectState::default()),
        })
        .setup(|app| {
            // App menu items (macOS "Retro IDE" menu)
            let about = MenuItemBuilder::with_id("about", "About Retro IDE").build(app)?;

            // File menu items
            let open_project = MenuItemBuilder::with_id("open_project", "Open Project...")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let close_project =
                MenuItemBuilder::with_id("close_project", "Close Project").build(app)?;
            let save_file = MenuItemBuilder::with_id("save_file", "Save")
                .accelerator("CmdOrCtrl+S")
                .build(app)?;

            // Edit menu items
            let undo = MenuItemBuilder::with_id("undo", "Undo")
                .accelerator("CmdOrCtrl+Z")
                .build(app)?;
            let redo = MenuItemBuilder::with_id("redo", "Redo")
                .accelerator("CmdOrCtrl+Shift+Z")
                .build(app)?;
            let cut = MenuItemBuilder::with_id("cut", "Cut")
                .accelerator("CmdOrCtrl+X")
                .build(app)?;
            let copy = MenuItemBuilder::with_id("copy", "Copy")
                .accelerator("CmdOrCtrl+C")
                .build(app)?;
            let paste = MenuItemBuilder::with_id("paste", "Paste")
                .accelerator("CmdOrCtrl+V")
                .build(app)?;
            let select_all = MenuItemBuilder::with_id("select_all", "Select All")
                .accelerator("CmdOrCtrl+A")
                .build(app)?;

            // Build App submenu (macOS application menu)
            let app_menu = SubmenuBuilder::new(app, "Retro IDE")
                .item(&about)
                .separator()
                .quit()
                .build()?;

            // Build File submenu
            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&open_project)
                .item(&close_project)
                .separator()
                .item(&save_file)
                .build()?;

            // Build Edit submenu
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .item(&undo)
                .item(&redo)
                .separator()
                .item(&cut)
                .item(&copy)
                .item(&paste)
                .separator()
                .item(&select_all)
                .build()?;

            // Build the full menu
            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .build()?;

            // Set the menu
            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            match id {
                "open_project" => {
                    let _ = app.emit("menu-open-project", ());
                }
                "close_project" => {
                    let _ = app.emit("menu-close-project", ());
                }
                "save_file" => {
                    let _ = app.emit("menu-save-file", ());
                }
                "undo" => {
                    let _ = app.emit("menu-undo", ());
                }
                "redo" => {
                    let _ = app.emit("menu-redo", ());
                }
                "cut" => {
                    let _ = app.emit("menu-cut", ());
                }
                "copy" => {
                    let _ = app.emit("menu-copy", ());
                }
                "paste" => {
                    let _ = app.emit("menu-paste", ());
                }
                "select_all" => {
                    let _ = app.emit("menu-select-all", ());
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_current_project,
            open_project_dialog,
            load_last_project,
            close_project,
            read_directory,
            read_file_contents,
            write_file_contents,
            read_file_binary
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
