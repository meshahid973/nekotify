use lofty::prelude::*;
use rusqlite::{Connection, OptionalExtension, params};
use serde::Serialize;
use std::{
    collections::HashSet,
    fs,
    path::PathBuf,
    sync::Mutex,
    time::{Duration, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

// Schema DDL and FTS backfill run once per process instead of on every query.
static SCHEMA_READY: Mutex<bool> = Mutex::new(false);

pub struct CachedMetadata {
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: f64,
    pub artwork_path: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Playlist {
    id: i64,
    name: String,
    track_paths: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Collections {
    favorites: Vec<String>,
    playlists: Vec<Playlist>,
}

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Cannot locate app data: {error}"))?;
    fs::create_dir_all(&dir).map_err(|error| format!("Cannot create app data: {error}"))?;
    Ok(dir.join("nekotify.sqlite"))
}

pub fn open(app: &AppHandle) -> Result<Connection, String> {
    let conn = Connection::open(db_path(app)?)
        .map_err(|error| format!("Cannot open library database: {error}"))?;
    conn.busy_timeout(Duration::from_secs(5))
        .map_err(|error| error.to_string())?;
    conn.pragma_update(None, "foreign_keys", "ON")
        .map_err(|error| error.to_string())?;
    let mut initialized = SCHEMA_READY
        .lock()
        .map_err(|_| "SQLite schema initialization lock failed".to_string())?;
    if !*initialized {
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             CREATE TABLE IF NOT EXISTS library_tracks (
               path TEXT PRIMARY KEY, modified_ms INTEGER NOT NULL, size INTEGER NOT NULL,
               title TEXT NOT NULL, artist TEXT NOT NULL, album TEXT,
               duration REAL NOT NULL, artwork_path TEXT
             );
             CREATE INDEX IF NOT EXISTS idx_tracks_artist ON library_tracks(artist);
             CREATE INDEX IF NOT EXISTS idx_tracks_album ON library_tracks(album);
             CREATE INDEX IF NOT EXISTS idx_tracks_title ON library_tracks(title COLLATE NOCASE);
             CREATE TABLE IF NOT EXISTS favorites (
               track_path TEXT PRIMARY KEY
             );
             CREATE TABLE IF NOT EXISTS playlists (
               id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS playlist_tracks (
               playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
               track_path TEXT NOT NULL, position INTEGER NOT NULL,
               PRIMARY KEY (playlist_id,track_path)
             );
             CREATE TABLE IF NOT EXISTS metadata_overrides (
               path TEXT PRIMARY KEY,
               title TEXT NOT NULL, artist TEXT NOT NULL, album TEXT
             );
             CREATE TABLE IF NOT EXISTS artwork_assignments (
               track_path TEXT PRIMARY KEY, artwork_path TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS listening_history (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               track_path TEXT NOT NULL,
               listened_at INTEGER NOT NULL DEFAULT (unixepoch())
             );",
        )
        .map_err(|error| format!("Cannot initialize library database: {error}"))?;
        // Maintain the native full-text index with the metadata cache. The index is
        // generated from existing tracks once and subsequently updated by triggers.
        conn.execute_batch(
            "CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5(
                 path UNINDEXED, title, artist, album,
                 tokenize='unicode61 remove_diacritics 2'
             );
             CREATE TRIGGER IF NOT EXISTS idx_fts_insert AFTER INSERT ON library_tracks BEGIN
               INSERT INTO tracks_fts(path,title,artist,album)
               VALUES(new.path,new.title,new.artist,COALESCE(new.album,''));
             END;
             CREATE TRIGGER IF NOT EXISTS idx_fts_delete AFTER DELETE ON library_tracks BEGIN
               DELETE FROM tracks_fts WHERE path=old.path;
             END;
             CREATE TRIGGER IF NOT EXISTS idx_fts_update AFTER UPDATE ON library_tracks BEGIN
               DELETE FROM tracks_fts WHERE path=old.path;
               INSERT INTO tracks_fts(path,title,artist,album)
               VALUES(new.path,new.title,new.artist,COALESCE(new.album,''));
             END;
             INSERT INTO tracks_fts(path,title,artist,album)
               SELECT path,title,artist,COALESCE(album,'') FROM library_tracks
               WHERE NOT EXISTS (SELECT 1 FROM tracks_fts LIMIT 1);",
        )
        .map_err(|error| format!("Cannot initialize search index: {error}"))?;
        // The existing path keys stay stable so favorites, playlists and art assignments
        // survive the transition to a query-driven library. Never mutate song files.
        let version: i64 = conn
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .map_err(|error| format!("Cannot read library schema version: {error}"))?;
        if version < 3 {
            conn.pragma_update(None, "user_version", 3_i64)
                .map_err(|error| format!("Cannot record library schema version: {error}"))?;
        }
        *initialized = true;
    }
    Ok(conn)
}

pub fn lookup(
    conn: &Connection,
    path: &str,
    modified_ms: i64,
    size: i64,
) -> Option<CachedMetadata> {
    conn.query_row(
        "SELECT title, artist, album, duration, artwork_path FROM library_tracks
         WHERE path = ?1 AND modified_ms = ?2 AND size = ?3",
        params![path, modified_ms, size],
        |row| {
            Ok(CachedMetadata {
                title: row.get(0)?,
                artist: row.get(1)?,
                album: row.get(2)?,
                duration: row.get(3)?,
                artwork_path: row.get(4)?,
            })
        },
    )
    .optional()
    .ok()
    .flatten()
}

pub fn save(
    conn: &Connection,
    path: &str,
    modified_ms: i64,
    size: i64,
    track: &CachedMetadata,
) -> Result<(), String> {
    let corrected: Option<(String, String, Option<String>)> = conn
        .query_row(
            "SELECT title,artist,album FROM metadata_overrides WHERE path=?1",
            params![path],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()
        .map_err(|e| format!("Cannot read track overrides: {e}"))?;
    let (title, artist, album) = corrected.unwrap_or_else(|| {
        (
            track.title.clone(),
            track.artist.clone(),
            track.album.clone(),
        )
    });
    conn.execute(
        "INSERT INTO library_tracks
         (path, modified_ms, size, title, artist, album, duration, artwork_path)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)
         ON CONFLICT(path) DO UPDATE SET
         modified_ms=excluded.modified_ms, size=excluded.size,
         title=excluded.title, artist=excluded.artist, album=excluded.album,
         duration=excluded.duration, artwork_path=excluded.artwork_path",
        params![
            path,
            modified_ms,
            size,
            title,
            artist,
            album,
            track.duration,
            track.artwork_path,
        ],
    )
    .map_err(|error| format!("Cannot cache track metadata: {error}"))?;
    Ok(())
}

/// Call only when EVERY configured root was enumerated without I/O errors.
pub fn prune(conn: &Connection, scanned: &HashSet<String>) -> Result<(), String> {
    let paths = {
        let mut statement = conn
            .prepare("SELECT path FROM library_tracks")
            .map_err(|error| error.to_string())?;
        let records = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|error| error.to_string())?;
        records.filter_map(Result::ok).collect::<Vec<_>>()
    };
    for path in paths {
        if !scanned.contains(&path) {
            conn.execute("DELETE FROM library_tracks WHERE path = ?1", params![path])
                .map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

pub fn assigned_artwork(conn: &Connection, path: &str) -> Option<String> {
    conn.query_row(
        "SELECT artwork_path FROM artwork_assignments WHERE track_path=?1",
        params![path],
        |row| row.get(0),
    )
    .optional()
    .ok()
    .flatten()
}

fn collections(conn: &Connection) -> Result<Collections, String> {
    let mut favorite_query = conn
        .prepare("SELECT track_path FROM favorites ORDER BY track_path")
        .map_err(|error| error.to_string())?;
    let favorites = favorite_query
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    let mut playlist_query = conn
        .prepare("SELECT id,name FROM playlists ORDER BY name")
        .map_err(|error| error.to_string())?;
    let mut playlists = Vec::new();
    let iter = playlist_query
        .query_map([], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|error| error.to_string())?;
    for record in iter {
        let (id, name) = record.map_err(|error| error.to_string())?;
        let mut item_query = conn
            .prepare(
                "SELECT track_path FROM playlist_tracks WHERE playlist_id=?1 ORDER BY position",
            )
            .map_err(|error| error.to_string())?;
        let track_paths = item_query
            .query_map(params![id], |row| row.get::<_, String>(0))
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        playlists.push(Playlist {
            id,
            name,
            track_paths,
        });
    }
    Ok(Collections {
        favorites,
        playlists,
    })
}

async fn with_collections(
    app: AppHandle,
    action: impl FnOnce(&Connection) -> Result<(), String> + Send + 'static,
) -> Result<Collections, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let conn = open(&app)?;
        action(&conn)?;
        collections(&conn)
    })
    .await
    .map_err(|error| format!("Database worker failed: {error}"))?
}

#[tauri::command]
pub async fn get_collections(app: AppHandle) -> Result<Collections, String> {
    with_collections(app, |_| Ok(())).await
}

#[tauri::command]
pub async fn toggle_favorite(app: AppHandle, path: String) -> Result<Collections, String> {
    with_collections(app, move |conn| {
        if conn
            .execute("DELETE FROM favorites WHERE track_path=?1", params![path])
            .map_err(|error| error.to_string())?
            == 0
        {
            conn.execute(
                "INSERT INTO favorites (track_path) VALUES (?1)",
                params![path],
            )
            .map_err(|error| error.to_string())?;
        }
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn create_playlist(app: AppHandle, name: String) -> Result<Collections, String> {
    let name = name.trim().to_string();
    if name.is_empty() || name.chars().count() > 80 {
        return Err("Playlist name must be 1–80 characters.".into());
    }
    with_collections(app, move |conn| {
        conn.execute("INSERT INTO playlists(name) VALUES (?1)", params![name])
            .map_err(|error| error.to_string())?;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn delete_playlist(app: AppHandle, playlist_id: i64) -> Result<Collections, String> {
    with_collections(app, move |conn| {
        conn.execute("DELETE FROM playlists WHERE id=?1", params![playlist_id])
            .map_err(|error| error.to_string())?;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn add_to_playlist(
    app: AppHandle,
    playlist_id: i64,
    path: String,
) -> Result<Collections, String> {
    with_collections(app, move |conn| {
        conn.execute(
            "INSERT OR IGNORE INTO playlist_tracks(playlist_id,track_path,position)
             SELECT ?1,?2, COALESCE(MAX(position)+1,0) FROM playlist_tracks
             WHERE playlist_id=?1",
            params![playlist_id, path],
        )
        .map_err(|error| error.to_string())?;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn remove_from_playlist(
    app: AppHandle,
    playlist_id: i64,
    path: String,
) -> Result<Collections, String> {
    with_collections(app, move |conn| {
        conn.execute(
            "DELETE FROM playlist_tracks WHERE playlist_id=?1 AND track_path=?2",
            params![playlist_id, path],
        )
        .map_err(|error| error.to_string())?;
        Ok(())
    })
    .await
}

fn recent_paths(conn: &Connection) -> Result<Vec<String>, String> {
    let mut statement = conn
        .prepare(
            "SELECT track_path FROM listening_history
         GROUP BY track_path ORDER BY MAX(id) DESC LIMIT 40",
        )
        .map_err(|error| error.to_string())?;
    statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn get_recent(app: AppHandle) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || recent_paths(&open(&app)?))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn record_listen(app: AppHandle, path: String) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let conn = open(&app)?;
        conn.execute(
            "INSERT INTO listening_history(track_path) VALUES (?1)",
            params![path],
        )
        .map_err(|error| error.to_string())?;
        conn.execute_batch(
            "DELETE FROM listening_history WHERE id NOT IN
             (SELECT id FROM listening_history ORDER BY id DESC LIMIT 2000)",
        )
        .map_err(|error| error.to_string())?;
        recent_paths(&conn)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackFileInfo {
    size_bytes: u64,
    modified_ms: Option<u64>,
    extension: String,
    embedded_title: Option<String>,
    embedded_artist: Option<String>,
    embedded_album: Option<String>,
}

#[tauri::command]
pub async fn get_track_file_info(app: AppHandle, path: String) -> Result<TrackFileInfo, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let conn = open(&app)?;
        let exists: i64 = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM library_tracks WHERE path=?1)",
                params![path],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        if exists == 0 {
            return Err("Track is not in your library".into());
        }
        let file = std::path::Path::new(&path);
        let info = std::fs::metadata(file).map_err(|e| format!("File is unavailable: {e}"))?;
        let modified_ms = info
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|v| v.as_millis() as u64);
        let extension = file
            .extension()
            .and_then(|v| v.to_str())
            .unwrap_or("audio")
            .to_ascii_uppercase();
        let tagged = lofty::read_from_path(file).ok();
        let tag = tagged
            .as_ref()
            .and_then(|file| file.primary_tag().or_else(|| file.first_tag()));
        Ok(TrackFileInfo {
            size_bytes: info.len(),
            modified_ms,
            extension,
            embedded_title: tag.and_then(|t| t.title()).map(|v| v.into_owned()),
            embedded_artist: tag.and_then(|t| t.artist()).map(|v| v.into_owned()),
            embedded_album: tag.and_then(|t| t.album()).map(|v| v.into_owned()),
        })
    })
    .await
    .map_err(|e| format!("Track details worker failed: {e}"))?
}

#[tauri::command]
pub async fn set_track_metadata(
    app: AppHandle,
    path: String,
    title: String,
    artist: String,
    album: String,
) -> Result<(), String> {
    let title = title.trim().to_string();
    let artist = artist.trim().to_string();
    let album = album.trim().to_string();
    if title.is_empty()
        || artist.is_empty()
        || title.chars().count() > 180
        || artist.chars().count() > 120
        || album.chars().count() > 180
    {
        return Err("Enter a title and artist; title/album max 180, artist max 120".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let mut conn = open(&app)?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let has: i64 = tx
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM library_tracks WHERE path=?1)",
                params![path],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        if has == 0 {
            return Err("Track is not in your library".into());
        }
        let album = if album.is_empty() { None } else { Some(album) };
        tx.execute(
            "INSERT INTO metadata_overrides(path,title,artist,album)
             VALUES(?1,?2,?3,?4)
             ON CONFLICT(path) DO UPDATE SET
             title=excluded.title,artist=excluded.artist,album=excluded.album",
            params![path, title, artist, album],
        )
        .map_err(|e| e.to_string())?;
        tx.execute(
            "UPDATE library_tracks SET title=?2,artist=?3,album=?4 WHERE path=?1",
            params![path, title, artist, album],
        )
        .map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Metadata worker failed: {e}"))?
}
