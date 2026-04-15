use crate::models::{PersistedState, WindowSessionState};
use crate::tools::ToolRegistry;
use anyhow::{Context, Result};
use directories::ProjectDirs;
use portable_pty::{Child, MasterPty};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

pub struct AppPaths {
    pub data_file: PathBuf,
    pub managed_node_root: PathBuf,
    pub managed_node_marker: PathBuf,
    pub npm_prefix: PathBuf,
    pub runtime_homes: PathBuf,
}

impl AppPaths {
    pub fn new() -> Result<Self> {
        let project_dirs = ProjectDirs::from("com", "CliHub", "CliHub")
            .context("unable to resolve application data directory")?;
        let base_dir = project_dirs.data_local_dir().to_path_buf();
        let managed_node_root = base_dir.join("runtime").join("node");
        let npm_prefix = base_dir.join("runtime").join("npm-global");
        let runtime_homes = base_dir.join("runtime").join("homes");
        fs::create_dir_all(&managed_node_root)?;
        fs::create_dir_all(&npm_prefix)?;
        fs::create_dir_all(&runtime_homes)?;
        Ok(Self {
            data_file: base_dir.join("state.json"),
            managed_node_marker: managed_node_root.join("current.json"),
            managed_node_root,
            npm_prefix,
            runtime_homes,
        })
    }

    pub fn managed_node_install_dir(&self, version: &str) -> PathBuf {
        self.managed_node_root.join(version)
    }

    pub fn runtime_home(&self, tool_id: &str) -> PathBuf {
        self.runtime_homes.join(tool_id)
    }

    pub fn ensure_parent(path: &Path) -> Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        Ok(())
    }
}

pub struct SessionRuntime {
    pub writer: Mutex<Box<dyn Write + Send>>,
    pub master: Mutex<Box<dyn MasterPty + Send>>,
    pub child: Mutex<Box<dyn Child + Send>>,
}

pub struct AppState {
    pub paths: AppPaths,
    pub registry: ToolRegistry,
    pub store: Mutex<PersistedState>,
    pub runtimes: Mutex<HashMap<String, Arc<SessionRuntime>>>,
    pub shutting_down: AtomicBool,
}

impl AppState {
    pub fn new() -> Result<Self> {
        let paths = AppPaths::new()?;
        let registry = ToolRegistry::new();
        let store = Self::load_store(&paths)?;
        Ok(Self {
            paths,
            registry,
            store: Mutex::new(store),
            runtimes: Mutex::new(HashMap::new()),
            shutting_down: AtomicBool::new(false),
        })
    }

    fn load_store(paths: &AppPaths) -> Result<PersistedState> {
        if !paths.data_file.exists() {
            return Ok(PersistedState::default());
        }
        let store = Self::read_store_file(&paths.data_file)
            .or_else(|| Self::read_store_file(&Self::backup_file_path(&paths.data_file)))
            .unwrap_or_default();
        Ok(Self::normalize_store(store))
    }

    fn normalize_store(mut store: PersistedState) -> PersistedState {
        for session in &mut store.sessions {
            if matches!(session.status.as_str(), "running" | "starting") {
                session.status = "stopped".to_string();
                session.last_exit_code = None;
            }
        }
        store
    }

    fn read_store_file(path: &Path) -> Option<PersistedState> {
        fs::read_to_string(path)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
    }

    fn backup_file_path(path: &Path) -> PathBuf {
        path.with_extension("bak")
    }

    fn temp_file_path(path: &Path) -> PathBuf {
        path.with_extension("tmp")
    }

    pub fn save_store(&self) -> Result<()> {
        let snapshot = {
            let guard = self
                .store
                .lock()
                .map_err(|_| anyhow::anyhow!("state store is poisoned"))?;
            guard.clone()
        };
        AppPaths::ensure_parent(&self.paths.data_file)?;
        let temp_file = Self::temp_file_path(&self.paths.data_file);
        let backup_file = Self::backup_file_path(&self.paths.data_file);
        fs::write(&temp_file, serde_json::to_string_pretty(&snapshot)?)?;
        if self.paths.data_file.exists() {
            let _ = fs::copy(&self.paths.data_file, &backup_file);
            let _ = fs::remove_file(&self.paths.data_file);
        }
        fs::rename(temp_file, &self.paths.data_file)?;
        Ok(())
    }

    pub fn ensure_window_state(&self, window_id: &str) -> Result<WindowSessionState> {
        let mut guard = self
            .store
            .lock()
            .map_err(|_| anyhow::anyhow!("state store is poisoned"))?;
        let entry = guard
            .windows
            .entry(window_id.to_string())
            .or_insert_with(|| WindowSessionState {
                window_id: window_id.to_string(),
                active_session_id: None,
                sidebar_selection: None,
                terminal_layout: "terminal".to_string(),
            });
        let snapshot = entry.clone();
        drop(guard);
        self.save_store()?;
        Ok(snapshot)
    }

    pub fn set_active_session_for_window(
        &self,
        window_id: &str,
        session_id: Option<String>,
    ) -> Result<()> {
        let mut guard = self
            .store
            .lock()
            .map_err(|_| anyhow::anyhow!("state store is poisoned"))?;
        let entry = guard
            .windows
            .entry(window_id.to_string())
            .or_insert_with(|| WindowSessionState {
                window_id: window_id.to_string(),
                active_session_id: None,
                sidebar_selection: None,
                terminal_layout: "terminal".to_string(),
            });
        entry.active_session_id = session_id;
        drop(guard);
        self.save_store()
    }

    pub fn next_window_label(&self) -> String {
        format!("session-{}", Uuid::new_v4())
    }
}
