use crate::database;
use lofty::{file::EXTENSIONS, picture::Picture, prelude::*};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::{
        Mutex,
        atomic::{AtomicBool, AtomicUsize, Ordering},
    },
    time::UNIX_EPOCH,
};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryFolder {
    path: String,
    name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtworkSource {
    path: String,
    name: String,
    kind: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryArtwork {
    id: String,
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
    art_sources: Vec<ArtworkSource>,
    artwork_pool: Vec<LibraryArtwork>,
    tracks: Vec<LibraryTrack>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(default)]
struct StoredLibrary {
    folders: Vec<String>,
    art_folders: Vec<String>,
    art_files: Vec<String>,
}

/// Return the durable index immediately; a full reconciliation is a separate operation.
/// This never traverses music folders or parses tags on the startup path.
// Only one disk reconciliation owns pruning decisions at any point in time.
// Cached reads remain concurrent and never take this lock.
static SCAN_LOCK: Mutex<()> = Mutex::new(());
static SCAN_RUNNING: AtomicBool = AtomicBool::new(false);
static SCAN_CANCEL: AtomicBool = AtomicBool::new(false);
static SCAN_VISITED: AtomicUsize = AtomicUsize::new(0);

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanStatus {
    running: bool,
    visited: usize,
}

#[tauri::command]
pub fn scan_status() -> ScanStatus {
    ScanStatus {
        running: SCAN_RUNNING.load(Ordering::Relaxed),
        visited: SCAN_VISITED.load(Ordering::Relaxed),
    }
}

#[tauri::command]
pub fn cancel_library_scan() {
    SCAN_CANCEL.store(true, Ordering::Relaxed);
}

struct ScanActivity;
impl Drop for ScanActivity {
    fn drop(&mut self) {
        SCAN_RUNNING.store(false, Ordering::Relaxed);
    }
}

#[tauri::command]
pub async fn cached_library(app: AppHandle) -> Result<LibrarySnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let stored = read_stored_library(&app)?;
        let cache_dir = artwork_cache_dir(&app)?;
        fs::create_dir_all(&cache_dir)
            .map_err(|error| format!("Could not create artwork cache: {error}"))?;
        app.asset_protocol_scope()
            .allow_directory(&cache_dir, true)
            .map_err(|error| format!("Could not expose artwork cache: {error}"))?;
        let conn = database::open(&app)?;
        let mut tracks = Vec::new();
        let mut query = conn
            .prepare(
                "SELECT t.path,t.title,t.artist,t.album,t.duration,
             COALESCE(a.artwork_path,t.artwork_path)
             FROM library_tracks t LEFT JOIN artwork_assignments a ON a.track_path=t.path
             ORDER BY t.artist COLLATE NOCASE,t.album COLLATE NOCASE,t.title COLLATE NOCASE,t.path",
            )
            .map_err(|error| error.to_string())?;
        let rows = query
            .query_map([], |row| {
                let path: String = row.get(0)?;
                Ok(LibraryTrack {
                    id: format!("{:016x}", fnv1a(path.as_bytes())),
                    path,
                    title: row.get(1)?,
                    artist: row.get(2)?,
                    album: row.get(3)?,
                    duration: row.get(4)?,
                    artwork_path: row.get(5)?,
                })
            })
            .map_err(|error| error.to_string())?;
        for item in rows {
            let mut track = item.map_err(|error| error.to_string())?;
            // Permissions are granted for known files only, never an entire disk.
            let path = Path::new(&track.path);
            if path.is_file() {
                let _ = app.asset_protocol_scope().allow_file(path);
            }
            track.artwork_path = track.artwork_path.filter(|art| {
                Path::new(art).is_file() && app.asset_protocol_scope().allow_file(art).is_ok()
            });
            tracks.push(track);
        }
        Ok(LibrarySnapshot {
            folders: stored
                .folders
                .iter()
                .map(|f| LibraryFolder {
                    path: f.clone(),
                    name: folder_name(Path::new(f)),
                })
                .collect(),
            art_sources: Vec::new(),
            artwork_pool: Vec::new(),
            tracks,
        })
    })
    .await
    .map_err(|error| format!("Cached library task failed: {error}"))?
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
    push_unique_path(&mut stored.folders, &path);
    write_stored_library(&app, &stored)?;

    tauri::async_runtime::spawn_blocking(move || build_snapshot(&app))
        .await
        .map_err(|error| format!("Library scan task failed: {error}"))?
        .map(Some)
}

#[tauri::command]
pub async fn import_art_folder(app: AppHandle) -> Result<Option<LibrarySnapshot>, String> {
    let selected = app
        .dialog()
        .file()
        .set_title("Add artwork folder")
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
    push_unique_path(&mut stored.art_folders, &path);
    write_stored_library(&app, &stored)?;

    tauri::async_runtime::spawn_blocking(move || build_snapshot(&app))
        .await
        .map_err(|error| format!("Artwork scan task failed: {error}"))?
        .map(Some)
}

#[tauri::command]
pub async fn import_art_file(app: AppHandle) -> Result<Option<LibrarySnapshot>, String> {
    let selected = app
        .dialog()
        .file()
        .set_title("Add cover image")
        .blocking_pick_file();

    let Some(selected) = selected else {
        return Ok(None);
    };

    let path = selected
        .simplified()
        .into_path()
        .map_err(|error| format!("Could not use the selected image: {error}"))?;

    if !path.is_file() || !is_supported_image(&path) {
        return Err("Choose a JPG, PNG, WEBP, GIF, or BMP image.".to_string());
    }

    let mut stored = read_stored_library(&app)?;
    push_unique_path(&mut stored.art_files, &path);
    write_stored_library(&app, &stored)?;

    tauri::async_runtime::spawn_blocking(move || build_snapshot(&app))
        .await
        .map_err(|error| format!("Artwork scan task failed: {error}"))?
        .map(Some)
}

#[tauri::command]
pub async fn remove_music_folder(app: AppHandle, path: String) -> Result<LibrarySnapshot, String> {
    let mut stored = read_stored_library(&app)?;
    stored
        .folders
        .retain(|existing| !paths_match(existing, &path));
    write_stored_library(&app, &stored)?;

    tauri::async_runtime::spawn_blocking(move || build_snapshot(&app))
        .await
        .map_err(|error| format!("Library scan task failed: {error}"))?
}

#[tauri::command]
pub async fn remove_art_source(app: AppHandle, path: String) -> Result<LibrarySnapshot, String> {
    let mut stored = read_stored_library(&app)?;
    stored
        .art_folders
        .retain(|existing| !paths_match(existing, &path));
    stored
        .art_files
        .retain(|existing| !paths_match(existing, &path));
    write_stored_library(&app, &stored)?;

    tauri::async_runtime::spawn_blocking(move || build_snapshot(&app))
        .await
        .map_err(|error| format!("Artwork scan task failed: {error}"))?
}

#[tauri::command]
pub async fn set_track_artwork(
    app: AppHandle,
    track_path: String,
    artwork_path: Option<String>,
) -> Result<LibrarySnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let connection = database::open(&app)?;
        let found = connection
            .query_row(
                "SELECT count(*) FROM library_tracks WHERE path=?1",
                rusqlite::params![track_path],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|error| error.to_string())?;
        if found == 0 {
            return Err("The selected track is not in the library.".to_string());
        }

        if let Some(ref requested) = artwork_path {
            let stored = read_stored_library(&app)?;
            let (_, pool) = build_artwork_pool(&app, &stored);
            if !pool.iter().any(|item| item.path == *requested) {
                return Err("Choose an image from an imported artwork source.".to_string());
            }
            connection
                .execute(
                    "INSERT INTO artwork_assignments(track_path,artwork_path) VALUES (?1,?2)
                 ON CONFLICT(track_path) DO UPDATE SET artwork_path=excluded.artwork_path",
                    rusqlite::params![track_path, requested],
                )
                .map_err(|error| error.to_string())?;
        } else {
            connection
                .execute(
                    "DELETE FROM artwork_assignments WHERE track_path=?1",
                    rusqlite::params![track_path],
                )
                .map_err(|error| error.to_string())?;
        }
        build_snapshot(&app)
    })
    .await
    .map_err(|error| format!("Artwork worker failed: {error}"))?
}

fn build_snapshot(app: &AppHandle) -> Result<LibrarySnapshot, String> {
    let _guard = SCAN_LOCK
        .lock()
        .map_err(|_| "Scan lock poisoned".to_string())?;
    SCAN_CANCEL.store(false, Ordering::Relaxed);
    SCAN_VISITED.store(0, Ordering::Relaxed);
    SCAN_RUNNING.store(true, Ordering::Relaxed);
    let _activity = ScanActivity;
    let stored = read_stored_library(app)?;
    let mut connection = database::open(app)?;
    let cache_dir = artwork_cache_dir(app)?;

    fs::create_dir_all(&cache_dir)
        .map_err(|error| format!("Could not create artwork cache: {error}"))?;

    app.asset_protocol_scope()
        .allow_directory(&cache_dir, true)
        .map_err(|error| format!("Could not expose artwork cache: {error}"))?;

    let mut folders = Vec::new();
    let mut tracks = Vec::new();
    let mut seen_track_ids = HashSet::new();
    let mut seen_paths = HashSet::new();
    // Incomplete scans must NEVER delete cached music: removable drives,
    // access-denied folders, transient I/O failures, and interrupted enumeration.
    let mut scan_complete = true;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;

    for folder in &stored.folders {
        if SCAN_CANCEL.load(Ordering::Relaxed) {
            scan_complete = false;
            break;
        }
        let path = PathBuf::from(folder);

        if !path.is_dir() {
            scan_complete = false;
            continue;
        }

        folders.push(LibraryFolder {
            name: folder_name(&path),
            path: folder.clone(),
        });

        scan_complete &= scan_music_directory(
            app,
            &cache_dir,
            &path,
            &transaction,
            &mut tracks,
            &mut seen_track_ids,
            &mut seen_paths,
        );
    }

    if scan_complete {
        database::prune(&transaction, &seen_paths)?;
    } else {
        // Keep cached tracks from unavailable roots in the visible snapshot.
        // No destructive pruning is allowed from a partial scan.
        let mut query = transaction
            .prepare(
                "SELECT path,title,artist,album,duration,
             COALESCE((SELECT artwork_path FROM artwork_assignments WHERE track_path=t.path),
             artwork_path) FROM library_tracks t",
            )
            .map_err(|error| error.to_string())?;
        let cached = query
            .query_map([], |row| {
                let path: String = row.get(0)?;
                Ok(LibraryTrack {
                    id: format!("{:016x}", fnv1a(path.as_bytes())),
                    path,
                    title: row.get(1)?,
                    artist: row.get(2)?,
                    album: row.get(3)?,
                    duration: row.get(4)?,
                    artwork_path: row.get(5)?,
                })
            })
            .map_err(|error| error.to_string())?;
        for item in cached {
            let mut track = item.map_err(|error| error.to_string())?;
            if !seen_track_ids.insert(track.id.clone()) {
                continue;
            }
            if Path::new(&track.path).is_file() {
                let _ = app.asset_protocol_scope().allow_file(&track.path);
            }
            track.artwork_path = track.artwork_path.filter(|art| {
                Path::new(art).is_file() && app.asset_protocol_scope().allow_file(art).is_ok()
            });
            tracks.push(track);
        }
    }
    transaction.commit().map_err(|error| error.to_string())?;

    let _ = app.emit(
        "library-scan-progress",
        ScanStatus {
            running: false,
            visited: SCAN_VISITED.load(Ordering::Relaxed),
        },
    );
    let (art_sources, artwork_pool) = build_artwork_pool(app, &stored);

    tracks.sort_by(|left, right| {
        left.artist
            .to_lowercase()
            .cmp(&right.artist.to_lowercase())
            .then_with(|| {
                left.album
                    .as_deref()
                    .unwrap_or("")
                    .to_lowercase()
                    .cmp(&right.album.as_deref().unwrap_or("").to_lowercase())
            })
            .then_with(|| left.title.to_lowercase().cmp(&right.title.to_lowercase()))
    });

    Ok(LibrarySnapshot {
        folders,
        art_sources,
        artwork_pool,
        tracks,
    })
}

fn build_artwork_pool(
    app: &AppHandle,
    stored: &StoredLibrary,
) -> (Vec<ArtworkSource>, Vec<LibraryArtwork>) {
    let mut sources = Vec::new();
    let mut pool = Vec::new();
    let mut seen_paths = HashSet::new();

    for folder in &stored.art_folders {
        let path = PathBuf::from(folder);

        if !path.is_dir() {
            continue;
        }

        sources.push(ArtworkSource {
            path: folder.clone(),
            name: folder_name(&path),
            kind: "folder".to_string(),
        });

        scan_art_directory(app, &path, &mut pool, &mut seen_paths);
    }

    for file in &stored.art_files {
        let path = PathBuf::from(file);

        if !path.is_file() || !is_supported_image(&path) {
            continue;
        }

        sources.push(ArtworkSource {
            path: file.clone(),
            name: file_name(&path),
            kind: "file".to_string(),
        });

        push_artwork(app, &path, &mut pool, &mut seen_paths);
    }

    (sources, pool)
}

fn scan_music_directory(
    app: &AppHandle,
    cache_dir: &Path,
    root: &Path,
    connection: &Connection,
    tracks: &mut Vec<LibraryTrack>,
    seen_track_ids: &mut HashSet<String>,
    seen_paths: &mut HashSet<String>,
) -> bool {
    let mut complete = true;
    let mut pending = vec![root.to_path_buf()];

    while let Some(directory) = pending.pop() {
        let Ok(entries) = fs::read_dir(&directory) else {
            complete = false;
            continue;
        };

        for result in entries {
            if SCAN_CANCEL.load(Ordering::Relaxed) {
                complete = false;
                break;
            }
            let Ok(entry) = result else {
                complete = false;
                continue;
            };
            let Ok(file_type) = entry.file_type() else {
                complete = false;
                continue;
            };
            if file_type.is_symlink() {
                continue;
            }

            let path = entry.path();
            if file_type.is_dir() {
                pending.push(path);
                continue;
            }
            if !file_type.is_file() || !is_supported_audio(&path) {
                continue;
            }
            if app.asset_protocol_scope().allow_file(&path).is_err() {
                complete = false;
                continue;
            }

            let path_string = path.to_string_lossy().into_owned();
            if !seen_paths.insert(path_string.clone()) {
                continue;
            }
            let visited = SCAN_VISITED.fetch_add(1, Ordering::Relaxed) + 1;
            if visited.is_multiple_of(256) {
                let _ = app.emit(
                    "library-scan-progress",
                    ScanStatus {
                        running: true,
                        visited,
                    },
                );
            }

            let file_info = fs::metadata(&path).ok().and_then(|meta| {
                let modified = meta.modified().ok()?.duration_since(UNIX_EPOCH).ok()?;
                Some((modified.as_millis() as i64, meta.len() as i64))
            });

            if file_info.is_none() {
                complete = false;
            }
            let cached = file_info.and_then(|(modified, size)| {
                database::lookup(connection, &path_string, modified, size)
            });

            let mut track = if let Some(metadata) = cached {
                let artwork_path = metadata.artwork_path.filter(|artwork| {
                    Path::new(artwork).is_file()
                        && app.asset_protocol_scope().allow_file(artwork).is_ok()
                });
                LibraryTrack {
                    id: format!("{:016x}", fnv1a(path_string.as_bytes())),
                    title: metadata.title,
                    artist: metadata.artist,
                    album: metadata.album,
                    duration: metadata.duration,
                    path: path_string.clone(),
                    artwork_path,
                }
            } else {
                let fresh = read_track(app, cache_dir, &path);
                if let Some((modified, size)) = file_info
                    && database::save(
                        connection,
                        &path_string,
                        modified,
                        size,
                        &database::CachedMetadata {
                            title: fresh.title.clone(),
                            artist: fresh.artist.clone(),
                            album: fresh.album.clone(),
                            duration: fresh.duration,
                            artwork_path: fresh.artwork_path.clone(),
                        },
                    )
                    .is_err()
                {
                    complete = false;
                }
                fresh
            };

            if let Some(override_path) = database::assigned_artwork(connection, &path_string)
                && Path::new(&override_path).is_file()
                && app
                    .asset_protocol_scope()
                    .allow_file(&override_path)
                    .is_ok()
            {
                track.artwork_path = Some(override_path);
            }

            if seen_track_ids.insert(track.id.clone()) {
                tracks.push(track)
            }
        }
    }
    complete
}

fn scan_art_directory(
    app: &AppHandle,
    root: &Path,
    pool: &mut Vec<LibraryArtwork>,
    seen_paths: &mut HashSet<String>,
) {
    let mut pending = vec![root.to_path_buf()];

    while let Some(directory) = pending.pop() {
        let Ok(entries) = fs::read_dir(&directory) else {
            continue;
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
                pending.push(path);
            } else if file_type.is_file() && is_supported_image(&path) {
                push_artwork(app, &path, pool, seen_paths);
            }
        }
    }
}

fn push_artwork(
    app: &AppHandle,
    path: &Path,
    pool: &mut Vec<LibraryArtwork>,
    seen_paths: &mut HashSet<String>,
) {
    let path_string = path.to_string_lossy().into_owned();

    if !seen_paths.insert(normalized_path_key(&path_string)) {
        return;
    }

    if app.asset_protocol_scope().allow_file(path).is_err() {
        return;
    }

    pool.push(LibraryArtwork {
        id: format!("{:016x}", fnv1a(path_string.as_bytes())),
        path: path_string,
        name: file_name(path),
    });
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

    let external_artwork = find_external_artwork(path).and_then(|artwork_path| {
        app.asset_protocol_scope()
            .allow_file(&artwork_path)
            .ok()
            .map(|_| artwork_path.to_string_lossy().into_owned())
    });

    let mut track = LibraryTrack {
        id,
        title: fallback_title,
        artist: "Unknown artist".to_string(),
        album: None,
        duration: 0.0,
        path: path_string,
        artwork_path: external_artwork,
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
            track.artwork_path = cache_picture(cache_dir, picture).or(track.artwork_path);
        }
    }

    track
}

fn cache_picture(cache_dir: &Path, picture: &Picture) -> Option<String> {
    // An embedded image must not allocate unbounded cache space from a corrupt
    // or malicious audio tag. The original audio file is never modified.
    if picture.data().is_empty() || picture.data().len() > 20 * 1024 * 1024 {
        return None;
    }

    let extension = picture
        .mime_type()
        .and_then(|mime| mime.ext())
        .or_else(|| image_extension_from_bytes(picture.data()))?;

    let artwork_id = fnv1a(picture.data());
    let path = cache_dir.join(format!("{artwork_id:016x}.{extension}"));

    if !path.exists() {
        // Same-directory temporary file + rename prevents truncated covers
        // after a crash or failed write; the scan lock serializes writers.
        let temp = cache_dir.join(format!("{artwork_id:016x}.{}.partial", std::process::id()));
        let write = (|| -> std::io::Result<()> {
            let mut file = fs::File::create(&temp)?;
            file.write_all(picture.data())?;
            file.sync_data()?;
            fs::rename(&temp, &path)?;
            Ok(())
        })();
        if write.is_err() {
            let _ = fs::remove_file(&temp);
            if !path.exists() {
                return None;
            }
        }
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
    } else if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        Some("webp")
    } else {
        None
    }
}

fn find_external_artwork(audio_path: &Path) -> Option<PathBuf> {
    let parent = audio_path.parent()?;
    let preferred_stems = ["cover", "folder", "front", "album", "artwork"];
    let entries = fs::read_dir(parent).ok()?;

    for entry in entries.flatten() {
        let path = entry.path();

        if !path.is_file() || !is_supported_image(&path) {
            continue;
        }

        let stem = path
            .file_stem()
            .and_then(|value| value.to_str())
            .map(str::to_ascii_lowercase);

        if stem
            .as_deref()
            .is_some_and(|value| preferred_stems.contains(&value))
        {
            return Some(path);
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

fn is_supported_image(path: &Path) -> bool {
    let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
        return false;
    };

    ["jpg", "jpeg", "png", "webp", "gif", "bmp"]
        .iter()
        .any(|candidate| candidate.eq_ignore_ascii_case(extension))
}

fn push_unique_path(paths: &mut Vec<String>, path: &Path) {
    let path_string = path.to_string_lossy().into_owned();

    if !paths
        .iter()
        .any(|existing| paths_match(existing, &path_string))
    {
        paths.push(path_string);
    }
}

fn folder_name(path: &Path) -> String {
    path.file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| path.to_string_lossy().into_owned())
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| path.to_string_lossy().into_owned())
}

fn normalized_path_key(path: &str) -> String {
    if cfg!(windows) {
        path.to_lowercase()
    } else {
        path.to_string()
    }
}

fn paths_match(left: &str, right: &str) -> bool {
    normalized_path_key(left) == normalized_path_key(right)
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

    fs::write(path, encoded).map_err(|error| format!("Could not save library settings: {error}"))
}

fn fnv1a(bytes: &[u8]) -> u64 {
    let mut hash = 0xcbf29ce484222325_u64;

    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }

    hash
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackPage {
    items: Vec<LibraryTrack>,
    total: i64,
    offset: u32,
    limit: u32,
}

fn indexed_tracks(
    app: &AppHandle,
    query: Option<&str>,
    offset: u32,
    limit: u32,
) -> Result<TrackPage, String> {
    let conn = database::open(app)?;
    let offset = offset.min(100_000);
    let limit = limit.clamp(1, 100);
    let words = query.unwrap_or("").trim();
    if words.chars().count() > 160 {
        return Err("Search is limited to 160 characters.".to_string());
    }
    // Quote literal tokens before handing them to the FTS5 grammar.
    // Prefix matching is quick for names and artists; no user-supplied SQL.
    let terms: Vec<String> = words
        .split_whitespace()
        .filter(|word| word.chars().any(char::is_alphanumeric))
        .take(12)
        .map(|word| format!("\"{}\"*", word.replace('"', "\"\"")))
        .collect();
    let search = !terms.is_empty();
    let phrase = terms.join(" ");
    let filter = if search {
        "WHERE t.path IN (SELECT path FROM tracks_fts WHERE tracks_fts MATCH ?1)"
    } else {
        ""
    };
    let count_sql = format!("SELECT COUNT(*) FROM library_tracks t {filter}");
    let total: i64 = if search {
        conn.query_row(&count_sql, rusqlite::params![phrase], |row| row.get(0))
    } else {
        conn.query_row(&count_sql, [], |row| row.get(0))
    }
    .map_err(|error| format!("Cannot count indexed tracks: {error}"))?;
    let sql = format!(
        "SELECT t.path,t.title,t.artist,t.album,t.duration,
         COALESCE(a.artwork_path,t.artwork_path)
         FROM library_tracks t
         LEFT JOIN artwork_assignments a ON a.track_path=t.path
         {filter}
         ORDER BY t.artist COLLATE NOCASE,t.album COLLATE NOCASE,
                  t.title COLLATE NOCASE,t.path
         LIMIT ?2 OFFSET ?3"
    );
    let mut stmt = conn.prepare(&sql).map_err(|error| error.to_string())?;
    // Both variants bind three parameters: an optional FTS phrase, a bounded
    // limit and a bounded offset. The no-filter query uses ?2 and ?3 as well.
    let rows = stmt
        .query_map(
            rusqlite::params![if search { phrase } else { String::new() }, limit, offset],
            |row| {
                let path: String = row.get(0)?;
                Ok(LibraryTrack {
                    id: format!("{:016x}", fnv1a(path.as_bytes())),
                    path,
                    title: row.get(1)?,
                    artist: row.get(2)?,
                    album: row.get(3)?,
                    duration: row.get(4)?,
                    artwork_path: row.get(5)?,
                })
            },
        )
        .map_err(|error| format!("Cannot query indexed tracks: {error}"))?;
    let mut items = Vec::new();
    for value in rows {
        let mut track = value.map_err(|error| error.to_string())?;
        if Path::new(&track.path).is_file() {
            let _ = app.asset_protocol_scope().allow_file(&track.path);
        }
        track.artwork_path = track.artwork_path.filter(|art| {
            Path::new(art).is_file() && app.asset_protocol_scope().allow_file(art).is_ok()
        });
        items.push(track);
    }
    Ok(TrackPage {
        items,
        total,
        offset,
        limit,
    })
}

#[tauri::command]
pub async fn query_tracks(app: AppHandle, offset: u32, limit: u32) -> Result<TrackPage, String> {
    tauri::async_runtime::spawn_blocking(move || indexed_tracks(&app, None, offset, limit))
        .await
        .map_err(|error| format!("Track query worker failed: {error}"))?
}

#[tauri::command]
pub async fn search_library(
    app: AppHandle,
    query: String,
    offset: u32,
    limit: u32,
) -> Result<TrackPage, String> {
    tauri::async_runtime::spawn_blocking(move || indexed_tracks(&app, Some(&query), offset, limit))
        .await
        .map_err(|error| format!("Search worker failed: {error}"))?
}
