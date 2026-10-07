use lofty::{file::EXTENSIONS, picture::Picture, prelude::*};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryFolder {
    path: String,
    name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryTrack {
    id: String,
    title: String,
    artist: String,
    album: Option<String>,
    duration: f64,
    path: String,
    artwork_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibrarySnapshot {
    folders: Vec<LibraryFolder>,
    tracks: Vec<LibraryTrack>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct StoredLibrary {
    folders: Vec<String>,
}

#[tauri::command]
pub async fn load_library(app: AppHandle) -> Result<LibrarySnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || build_snapshot(&app))
        .await
        .map_err(|error| format!("Library scan task failed: {error}"))?
}

#[tauri::command]
pub async fn import_music_folder(app: AppHandle) -> Result<Option<LibrarySnapshot>, String> {
    let selected = app
        .dialog()
        .file()
        .set_title("Add music folder")
        .blocking_pick_folder();

    let Some(selected) = selected else {
        return Ok(None);
    };

    let path = selected
        .simplified()
        .into_path()
        .map_err(|error| format!("Could not use the selected folder: {error}"))?;

    if !path.is_dir() {
        return Err("The selected path is not a folder.".to_string());
    }

    let mut stored = read_stored_library(&app)?;
    let path_string = path.to_string_lossy().into_owned();

    if !stored
        .folders
        .iter()
        .any(|existing| paths_match(existing, &path_string))
    {
        stored.folders.push(path_string);
        write_stored_library(&app, &stored)?;
    }

    tauri::async_runtime::spawn_blocking(move || build_snapshot(&app))
        .await
        .map_err(|error| format!("Library scan task failed: {error}"))?
        .map(Some)
}

#[tauri::command]
pub async fn remove_music_folder(
    app: AppHandle,
    path: String,
) -> Result<LibrarySnapshot, String> {
    let mut stored = read_stored_library(&app)?;
    stored
        .folders
        .retain(|existing| !paths_match(existing, &path));
    write_stored_library(&app, &stored)?;

    tauri::async_runtime::spawn_blocking(move || build_snapshot(&app))
        .await
        .map_err(|error| format!("Library scan task failed: {error}"))?
}

fn build_snapshot(app: &AppHandle) -> Result<LibrarySnapshot, String> {
    let stored = read_stored_library(app)?;
    let cache_dir = artwork_cache_dir(app)?;

    fs::create_dir_all(&cache_dir)
        .map_err(|error| format!("Could not create artwork cache: {error}"))?;

    app.asset_protocol_scope()
        .allow_directory(&cache_dir, true)
        .map_err(|error| format!("Could not expose artwork cache: {error}"))?;

    let mut folders = Vec::new();
    let mut tracks = Vec::new();

    for folder in stored.folders {
        let path = PathBuf::from(&folder);

        if !path.is_dir() {
            continue;
        }

        app.asset_protocol_scope()
            .allow_directory(&path, true)
            .map_err(|error| format!("Could not expose music folder: {error}"))?;

        folders.push(LibraryFolder {
            name: folder_name(&path),
            path: folder.clone(),
        });

        scan_directory(app, &cache_dir, &path, &mut tracks);
    }

    tracks.sort_by(|left, right| {
        left.artist
            .to_lowercase()
            .cmp(&right.artist.to_lowercase())
            .then_with(|| left.title.to_lowercase().cmp(&right.title.to_lowercase()))
    });

    Ok(LibrarySnapshot { folders, tracks })
}

fn scan_directory(
    app: &AppHandle,
    cache_dir: &Path,
    directory: &Path,
    tracks: &mut Vec<LibraryTrack>,
) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };

    for entry in entries.flatten() {
        let Ok(file_type) = entry.file_type() else {
            continue;
        };

        if file_type.is_symlink() {
            continue;
        }

        let path = entry.path();

        if file_type.is_dir() {
            scan_directory(app, cache_dir, &path, tracks);
            continue;
        }

        if file_type.is_file() && is_supported_audio(&path) {
            tracks.push(read_track(app, cache_dir, &path));
        }
    }
}

fn read_track(app: &AppHandle, cache_dir: &Path, path: &Path) -> LibraryTrack {
    let path_string = path.to_string_lossy().into_owned();
    let id = format!("{:016x}", fnv1a(path_string.as_bytes()));
    let fallback_title = path
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("Untitled")
        .to_string();

    let mut track = LibraryTrack {
        id,
        title: fallback_title,
        artist: "Unknown artist".to_string(),
        album: None,
        duration: 0.0,
        path: path_string,
        artwork_path: find_external_artwork(path),
    };

    let Ok(tagged_file) = lofty::read_from_path(path) else {
        return track;
    };

    track.duration = tagged_file.properties().duration().as_secs_f64();

    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag());

    if let Some(tag) = tag {
        if let Some(title) = tag
            .title()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
        {
            track.title = title;
        }

        if let Some(artist) = tag
            .artist()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
        {
            track.artist = artist;
        }

        track.album = tag
            .album()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());

        if let Some(picture) = tag.pictures().first() {
            track.artwork_path = cache_picture(app, cache_dir, picture).or(track.artwork_path);
        }
    }

    track
}

fn cache_picture(app: &AppHandle, cache_dir: &Path, picture: &Picture) -> Option<String> {
    if picture.data().is_empty() {
        return None;
    }

    let extension = picture
        .mime_type()
        .and_then(|mime| mime.ext())
        .or_else(|| image_extension_from_bytes(picture.data()))?;

    let artwork_id = fnv1a(picture.data());
    let path = cache_dir.join(format!("{artwork_id:016x}.{extension}"));

    if !path.exists() && fs::write(&path, picture.data()).is_err() {
        return None;
    }

    if app.asset_protocol_scope().allow_file(&path).is_err() {
        return None;
    }

    Some(path.to_string_lossy().into_owned())
}

fn image_extension_from_bytes(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        Some("png")
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("jpg")
    } else if bytes.starts_with(b"GIF8") {
        Some("gif")
    } else if bytes.starts_with(b"BM") {
        Some("bmp")
    } else {
        None
    }
}

fn find_external_artwork(audio_path: &Path) -> Option<String> {
    let parent = audio_path.parent()?;

    for name in [
        "cover.jpg",
        "cover.jpeg",
        "cover.png",
        "folder.jpg",
        "folder.jpeg",
        "folder.png",
        "front.jpg",
        "front.jpeg",
        "front.png",
    ] {
        let candidate = parent.join(name);
        if candidate.is_file() {
            return Some(candidate.to_string_lossy().into_owned());
        }
    }

    None
}

fn is_supported_audio(path: &Path) -> bool {
    let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
        return false;
    };

    EXTENSIONS
        .iter()
        .any(|candidate| candidate.eq_ignore_ascii_case(extension))
}

fn folder_name(path: &Path) -> String {
    path.file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| path.to_string_lossy().into_owned())
}

fn paths_match(left: &str, right: &str) -> bool {
    if cfg!(windows) {
        left.eq_ignore_ascii_case(right)
    } else {
        left == right
    }
}

fn stored_library_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve app data folder: {error}"))?;

    fs::create_dir_all(&directory)
        .map_err(|error| format!("Could not create app data folder: {error}"))?;

    Ok(directory.join("library.json"))
}

fn artwork_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_cache_dir()
        .map(|directory| directory.join("artwork"))
        .map_err(|error| format!("Could not resolve artwork cache: {error}"))
}

fn read_stored_library(app: &AppHandle) -> Result<StoredLibrary, String> {
    let path = stored_library_path(app)?;

    if !path.exists() {
        return Ok(StoredLibrary::default());
    }

    let contents = fs::read_to_string(&path)
        .map_err(|error| format!("Could not read library settings: {error}"))?;

    serde_json::from_str(&contents)
        .map_err(|error| format!("Could not parse library settings: {error}"))
}

fn write_stored_library(app: &AppHandle, stored: &StoredLibrary) -> Result<(), String> {
    let path = stored_library_path(app)?;
    let encoded = serde_json::to_vec_pretty(stored)
        .map_err(|error| format!("Could not encode library settings: {error}"))?;

    fs::write(path, encoded)
        .map_err(|error| format!("Could not save library settings: {error}"))
}

fn fnv1a(bytes: &[u8]) -> u64 {
    let mut hash = 0xcbf29ce484222325_u64;

    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }

    hash
}

