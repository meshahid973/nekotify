use crate::database;
use super::{LibraryTrack, fnv1a};
use serde::Serialize;
use std::path::Path;
use tauri::{AppHandle, Manager};

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
