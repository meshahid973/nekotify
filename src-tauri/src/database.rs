use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::{collections::HashSet, fs, path::PathBuf, time::Duration};
use tauri::{AppHandle, Manager};

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
    let dir = app.path().app_data_dir()
        .map_err(|error| format!("Cannot locate app data: {error}"))?;
    fs::create_dir_all(&dir).map_err(|error| format!("Cannot create app data: {error}"))?;
    Ok(dir.join("nekotify.sqlite"))
}

pub fn open(app: &AppHandle) -> Result<Connection, String> {
    let mut conn = Connection::open(db_path(app)?)
        .map_err(|error| format!("Cannot open library database: {error}"))?;
    conn.busy_timeout(Duration::from_secs(5))
        .map_err(|error| error.to_string())?;
    conn.pragma_update(None, "foreign_keys", "ON")
        .map_err(|error| error.to_string())?;
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         CREATE TABLE IF NOT EXISTS library_tracks (
           path TEXT PRIMARY KEY, modified_ms INTEGER NOT NULL, size INTEGER NOT NULL,
           title TEXT NOT NULL, artist TEXT NOT NULL, album TEXT,
           duration REAL NOT NULL, artwork_path TEXT
         );
         CREATE INDEX IF NOT EXISTS idx_tracks_artist ON library_tracks(artist);
         CREATE INDEX IF NOT EXISTS idx_tracks_album ON library_tracks(album);
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
         CREATE TABLE IF NOT EXISTS artwork_assignments (
           track_path TEXT PRIMARY KEY, artwork_path TEXT NOT NULL
         );
         CREATE TABLE IF NOT EXISTS listening_history (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           track_path TEXT NOT NULL,
           listened_at INTEGER NOT NULL DEFAULT (unixepoch())
         );"
    ).map_err(|error| format!("Cannot initialize library database: {error}"))?;
    Ok(conn)
}

pub fn lookup(
    conn: &Connection, path: &str, modified_ms: i64, size: i64,
) -> Option<CachedMetadata> {
    conn.query_row(
        "SELECT title, artist, album, duration, artwork_path FROM library_tracks
         WHERE path = ?1 AND modified_ms = ?2 AND size = ?3",
        params![path, modified_ms, size],
        |row| Ok(CachedMetadata {
            title: row.get(0)?,
            artist: row.get(1)?,
            album: row.get(2)?,
            duration: row.get(3)?,
            artwork_path: row.get(4)?,
        }),
    ).optional().ok().flatten()
}

pub fn save(
    conn: &Connection, path: &str, modified_ms: i64, size: i64,
    track: &CachedMetadata,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO library_tracks
         (path, modified_ms, size, title, artist, album, duration, artwork_path)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)
         ON CONFLICT(path) DO UPDATE SET
         modified_ms=excluded.modified_ms, size=excluded.size,
         title=excluded.title, artist=excluded.artist, album=excluded.album,
         duration=excluded.duration, artwork_path=excluded.artwork_path",
        params![
            path, modified_ms, size, track.title, track.artist,
            track.album, track.duration, track.artwork_path,
        ],
    ).map_err(|error| format!("Cannot cache track metadata: {error}"))?;
    Ok(())
}

pub fn prune(conn: &Connection, scanned: &HashSet<String>) -> Result<(), String> {
    let paths = {
        let mut statement = conn.prepare("SELECT path FROM library_tracks")
            .map_err(|error| error.to_string())?;
        let records = statement.query_map([], |row| row.get::<_, String>(0))
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
        params![path], |row| row.get(0),
    ).optional().ok().flatten()
}

fn collections(conn: &Connection) -> Result<Collections, String> {
    let mut favorite_query = conn.prepare("SELECT track_path FROM favorites ORDER BY track_path")
        .map_err(|error| error.to_string())?;
    let favorites = favorite_query
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())?;

    let mut playlist_query = conn.prepare("SELECT id,name FROM playlists ORDER BY name")
        .map_err(|error| error.to_string())?;
    let mut playlists = Vec::new();
    let iter = playlist_query
        .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))
        .map_err(|error| error.to_string())?;
    for record in iter {
        let (id, name) = record.map_err(|error| error.to_string())?;
        let mut item_query = conn.prepare(
            "SELECT track_path FROM playlist_tracks WHERE playlist_id=?1 ORDER BY position"
        ).map_err(|error| error.to_string())?;
        let track_paths = item_query
            .query_map(params![id], |row| row.get::<_, String>(0))
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())?;
        playlists.push(Playlist { id, name, track_paths });
    }
    Ok(Collections { favorites, playlists })
}

async fn with_collections(
    app: AppHandle, action: impl FnOnce(&Connection) -> Result<(), String> + Send + 'static,
) -> Result<Collections, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let conn = open(&app)?;
        action(&conn)?;
        collections(&conn)
    }).await.map_err(|error| format!("Database worker failed: {error}"))?
}

#[tauri::command]
pub async fn get_collections(app: AppHandle) -> Result<Collections, String> {
    with_collections(app, |_| Ok(())).await
}

#[tauri::command]
pub async fn toggle_favorite(app: AppHandle, path: String) -> Result<Collections, String> {
    with_collections(app, move |conn| {
        if conn.execute("DELETE FROM favorites WHERE track_path=?1", params![path])
            .map_err(|error| error.to_string())? == 0 {
            conn.execute("INSERT INTO favorites (track_path) VALUES (?1)", params![path])
                .map_err(|error| error.to_string())?;
        }
        Ok(())
    }).await
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
    }).await
}

#[tauri::command]
pub async fn delete_playlist(app: AppHandle, playlist_id: i64) -> Result<Collections, String> {
    with_collections(app, move |conn| {
        conn.execute("DELETE FROM playlists WHERE id=?1", params![playlist_id])
            .map_err(|error| error.to_string())?;
        Ok(())
    }).await
}

#[tauri::command]
pub async fn add_to_playlist(
    app: AppHandle, playlist_id: i64, path: String,
) -> Result<Collections, String> {
    with_collections(app, move |conn| {
        conn.execute(
            "INSERT OR IGNORE INTO playlist_tracks(playlist_id,track_path,position)
             SELECT ?1,?2, COALESCE(MAX(position)+1,0) FROM playlist_tracks
             WHERE playlist_id=?1",
            params![playlist_id, path],
        ).map_err(|error| error.to_string())?;
        Ok(())
    }).await
}

#[tauri::command]
pub async fn remove_from_playlist(
    app: AppHandle, playlist_id: i64, path: String,
) -> Result<Collections, String> {
    with_collections(app, move |conn| {
        conn.execute(
            "DELETE FROM playlist_tracks WHERE playlist_id=?1 AND track_path=?2",
            params![playlist_id, path],
        ).map_err(|error| error.to_string())?;
        Ok(())
    }).await
}
