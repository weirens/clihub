use crate::models::ManagedNodeState;
use crate::process_utils::hide_background_window;
use crate::state::AppPaths;
use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::Deserialize;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::process::Command;
use tar::Archive;
use xz2::read::XzDecoder;
use zip::ZipArchive;

pub struct NodeRuntimeManager;

#[derive(Debug, Clone)]
pub struct NodeEnv {
    pub npm_path: PathBuf,
    pub env: HashMap<String, String>,
    pub version: String,
}

#[derive(Debug, Deserialize)]
struct NodeRelease {
    version: String,
    lts: serde_json::Value,
}

impl NodeRuntimeManager {
    pub fn detect_system_node() -> Option<String> {
        let mut command = Command::new("node");
        hide_background_window(&mut command);
        command
            .arg("-v")
            .output()
            .ok()
            .filter(|output| output.status.success())
            .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    pub fn detect_managed_node(paths: &AppPaths, version_hint: Option<String>) -> ManagedNodeState {
        let version = version_hint.and_then(|candidate| {
            let root = paths.managed_node_install_dir(&candidate);
            if Self::node_binary_at(&root).exists() {
                Some(candidate)
            } else {
                None
            }
        });
        let installed = version.is_some();
        let root_dir = version
            .as_ref()
            .map(|value| paths.managed_node_install_dir(value))
            .unwrap_or_else(|| paths.managed_node_root.clone());
        ManagedNodeState {
            installed,
            version,
            root_dir: root_dir.display().to_string(),
            npm_prefix: paths.npm_prefix.display().to_string(),
        }
    }

    pub async fn ensure_managed_node(paths: &AppPaths) -> Result<ManagedNodeState> {
        if let Some(version) = Self::read_managed_marker(paths)? {
            let root = paths.managed_node_install_dir(&version);
            if Self::node_binary_at(&root).exists() {
                return Ok(ManagedNodeState {
                    installed: true,
                    version: Some(version),
                    root_dir: root.display().to_string(),
                    npm_prefix: paths.npm_prefix.display().to_string(),
                });
            }
        }

        let release = Self::fetch_latest_lts_release().await?;
        let install_dir = paths.managed_node_install_dir(&release.version);
        if !Self::node_binary_at(&install_dir).exists() {
            fs::create_dir_all(&install_dir)?;
            let archive_bytes = Self::download_archive(&release.version).await?;
            Self::extract_archive(&archive_bytes, &install_dir)?;
        }

        fs::create_dir_all(&paths.npm_prefix)?;
        AppPaths::ensure_parent(&paths.managed_node_marker)?;
        fs::write(
            &paths.managed_node_marker,
            serde_json::to_string_pretty(&serde_json::json!({ "version": release.version }))?,
        )?;

        Ok(ManagedNodeState {
            installed: true,
            version: Some(release.version.clone()),
            root_dir: install_dir.display().to_string(),
            npm_prefix: paths.npm_prefix.display().to_string(),
        })
    }

    pub async fn resolve_node_env(paths: &AppPaths, provider: &str) -> Result<NodeEnv> {
        match provider {
            "system" => Self::system_node_env(paths),
            _ => Self::managed_node_env(paths).await,
        }
    }

    fn system_node_env(paths: &AppPaths) -> Result<NodeEnv> {
        let npm_path = which::which("npm").or_else(|_| which::which("npm.cmd"))?;
        let version = Self::detect_system_node().ok_or_else(|| anyhow!("unable to read node version"))?;
        let mut env = HashMap::new();
        env.insert(
            "npm_config_prefix".to_string(),
            paths.npm_prefix.display().to_string(),
        );
        env.insert(
            "NPM_CONFIG_PREFIX".to_string(),
            paths.npm_prefix.display().to_string(),
        );
        Ok(NodeEnv {
            npm_path,
            env,
            version,
        })
    }

    async fn managed_node_env(paths: &AppPaths) -> Result<NodeEnv> {
        let managed = Self::ensure_managed_node(paths).await?;
        let version = managed
            .version
            .clone()
            .ok_or_else(|| anyhow!("managed node version is missing"))?;
        let root = paths.managed_node_install_dir(&version);
        let npm_path = Self::npm_binary_at(&root);
        let mut env = HashMap::new();
        let path_value = std::env::var("PATH").unwrap_or_default();
        let bin_dirs = Self::path_entries(paths, &root);
        let combined = if path_value.is_empty() {
            bin_dirs.join(Self::path_separator())
        } else {
            format!("{}{}{}", bin_dirs.join(Self::path_separator()), Self::path_separator(), path_value)
        };
        env.insert("PATH".to_string(), combined);
        env.insert(
            "npm_config_prefix".to_string(),
            paths.npm_prefix.display().to_string(),
        );
        env.insert(
            "NPM_CONFIG_PREFIX".to_string(),
            paths.npm_prefix.display().to_string(),
        );
        Ok(NodeEnv {
            npm_path,
            env,
            version,
        })
    }

    pub fn install_bin_path(paths: &AppPaths, binary_name: &str) -> PathBuf {
        if cfg!(target_os = "windows") {
            paths.npm_prefix.join(format!("{binary_name}.cmd"))
        } else {
            paths.npm_prefix.join("bin").join(binary_name)
        }
    }

    fn read_managed_marker(paths: &AppPaths) -> Result<Option<String>> {
        if !paths.managed_node_marker.exists() {
            return Ok(None);
        }
        let raw = fs::read_to_string(&paths.managed_node_marker)?;
        let parsed: serde_json::Value = serde_json::from_str(&raw)?;
        Ok(parsed
            .get("version")
            .and_then(|value| value.as_str())
            .map(str::to_string))
    }

    async fn fetch_latest_lts_release() -> Result<NodeRelease> {
        let client = Client::builder().build()?;
        let releases = client
            .get("https://nodejs.org/dist/index.json")
            .send()
            .await?
            .error_for_status()?
            .json::<Vec<NodeRelease>>()
            .await?;
        releases
            .into_iter()
            .find(|release| !release.lts.is_boolean() || release.lts != serde_json::Value::Bool(false))
            .ok_or_else(|| anyhow!("could not find an LTS Node.js release"))
    }

    async fn download_archive(version: &str) -> Result<Vec<u8>> {
        let client = Client::builder().build()?;
        let archive_name = Self::archive_name(version)?;
        let url = format!("https://nodejs.org/dist/{version}/{archive_name}");
        Ok(client
            .get(url)
            .send()
            .await?
            .error_for_status()?
            .bytes()
            .await?
            .to_vec())
    }

    fn archive_name(version: &str) -> Result<String> {
        let arch = match std::env::consts::ARCH {
            "x86_64" => "x64",
            "aarch64" => "arm64",
            other => return Err(anyhow!("unsupported CPU architecture: {other}")),
        };
        let os = match std::env::consts::OS {
            "windows" => "win",
            "macos" => "darwin",
            other => return Err(anyhow!("unsupported operating system: {other}")),
        };
        Ok(if cfg!(target_os = "windows") {
            format!("node-{version}-{os}-{arch}.zip")
        } else {
            format!("node-{version}-{os}-{arch}.tar.xz")
        })
    }

    fn extract_archive(bytes: &[u8], install_dir: &Path) -> Result<()> {
        if cfg!(target_os = "windows") {
            let cursor = Cursor::new(bytes);
            let mut archive = ZipArchive::new(cursor)?;
            for idx in 0..archive.len() {
                let mut file = archive.by_index(idx)?;
                let enclosed = match file.enclosed_name() {
                    Some(path) => path.to_path_buf(),
                    None => continue,
                };
                let relative = Self::strip_top_level(&enclosed);
                if relative.as_os_str().is_empty() {
                    continue;
                }
                let out_path = install_dir.join(relative);
                if file.is_dir() {
                    fs::create_dir_all(&out_path)?;
                    continue;
                }
                if let Some(parent) = out_path.parent() {
                    fs::create_dir_all(parent)?;
                }
                let mut target = File::create(&out_path)?;
                std::io::copy(&mut file, &mut target)?;
            }
            return Ok(());
        }

        let cursor = Cursor::new(bytes);
        let decoder = XzDecoder::new(cursor);
        let mut archive = Archive::new(decoder);
        for entry in archive.entries()? {
            let mut entry = entry?;
            let path = entry.path()?;
            let relative = Self::strip_top_level(&path);
            if relative.as_os_str().is_empty() {
                continue;
            }
            let out_path = install_dir.join(relative);
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent)?;
            }
            entry.unpack(out_path)?;
        }
        Ok(())
    }

    fn strip_top_level(path: &Path) -> PathBuf {
        let mut components = path.components();
        components.next();
        components.as_path().to_path_buf()
    }

    fn path_entries(paths: &AppPaths, root: &Path) -> Vec<String> {
        let mut entries = Vec::new();
        if cfg!(target_os = "windows") {
            entries.push(root.display().to_string());
            entries.push(paths.npm_prefix.display().to_string());
        } else {
            entries.push(root.join("bin").display().to_string());
            entries.push(paths.npm_prefix.join("bin").display().to_string());
        }
        entries
    }

    fn path_separator() -> &'static str {
        if cfg!(target_os = "windows") {
            ";"
        } else {
            ":"
        }
    }

    fn node_binary_at(root: &Path) -> PathBuf {
        if cfg!(target_os = "windows") {
            root.join("node.exe")
        } else {
            root.join("bin").join("node")
        }
    }

    fn npm_binary_at(root: &Path) -> PathBuf {
        if cfg!(target_os = "windows") {
            root.join("npm.cmd")
        } else {
            root.join("bin").join("npm")
        }
    }
}
