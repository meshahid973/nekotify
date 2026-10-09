use super::{LibraryTrack};
use super::queries::{TrackPage, track_from_row, permit_track};
use crate::database;
use rusqlite::{params_from_iter, types::Value};
use serde::Serialize;
use std::path::Path;
use tauri::{AppHandle, Manager};

fn view_tracks(app:&AppHandle,mode:&str,playlist_id:Option<i64>,
    label:Option<&str>,artist:Option<&str>,
    offset:u32,limit:u32)->Result<TrackPage,String>{
    let conn=database::open(app)?;
    let offset=offset.min(1_000_000);
    let limit=limit.clamp(1,100);
    let (from,filter,order,args):( &str,&str,&str,Vec<Value>)=match mode {
      "favorites"=>(
        "FROM favorites f JOIN library_tracks t ON t.path=f.track_path",
        "","ORDER BY t.artist COLLATE NOCASE,t.album COLLATE NOCASE,t.title COLLATE NOCASE,t.path",
        vec![]),
      "playlist"=>(
        "FROM playlist_tracks pt JOIN library_tracks t ON t.path=pt.track_path",
        "WHERE pt.playlist_id=?",
        "ORDER BY pt.position,t.path",
        vec![Value::Integer(playlist_id.ok_or("Missing playlist id")?)]),
      "artist"=>(
        "FROM library_tracks t",
        "WHERE COALESCE(NULLIF(TRIM(t.artist),''),'Unknown artist')=?",
        "ORDER BY t.album COLLATE NOCASE,t.title COLLATE NOCASE,t.path",
        vec![Value::Text(label.ok_or("Missing artist")?.to_string())]),
      "album"=>(
        "FROM library_tracks t",
        "WHERE COALESCE(NULLIF(TRIM(t.album),''),'Unknown album')=?
          AND COALESCE(NULLIF(TRIM(t.artist),''),'Unknown artist')=?",
        "ORDER BY t.title COLLATE NOCASE,t.path",
        vec![Value::Text(label.ok_or("Missing album")?.to_string()),
             Value::Text(artist.ok_or("Missing album artist")?.to_string())]),
      _=>return Err("Unsupported library view".into()),
    };
    let count_sql=format!("SELECT COUNT(*) {from} {filter}");
    let total:i64=conn.query_row(&count_sql,params_from_iter(args.iter()),|r|r.get(0))
        .map_err(|e|format!("Cannot count library view: {e}"))?;
    let sql=format!(
      "SELECT t.path,t.title,t.artist,t.album,t.duration,
       COALESCE(a.artwork_path,t.artwork_path) {from}
       LEFT JOIN artwork_assignments a ON a.track_path=t.path
       {filter} {order} LIMIT ? OFFSET ?"
    );
    let mut stmt=conn.prepare(&sql).map_err(|e|e.to_string())?;
    let mut values=args;
    values.push(Value::Integer(i64::from(limit)));
    values.push(Value::Integer(i64::from(offset)));
    let records=stmt.query_map(params_from_iter(values.iter()),track_from_row)
        .map_err(|e|e.to_string())?;
    let mut items=Vec::new();
    for record in records {
      items.push(permit_track(app,record.map_err(|e|e.to_string())?));
    }
    Ok(TrackPage{items,total,offset,limit})
}

#[tauri::command]
pub async fn query_library_view(app:AppHandle,mode:String,playlist_id:Option<i64>,
    label:Option<String>,artist:Option<String>,offset:u32,limit:u32)
    ->Result<TrackPage,String>{
    tauri::async_runtime::spawn_blocking(move||view_tracks(&app,&mode,playlist_id,
      label.as_deref(),artist.as_deref(),offset,limit))
      .await.map_err(|e|format!("Library view worker failed: {e}"))?
}

#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct GroupSummary{
    title:String,
    artist:String,
    count:i64,
    artwork_path:Option<String>,
}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct GroupPage{
    items:Vec<GroupSummary>,
    total:i64,
    offset:u32,
    limit:u32,
}

fn groups(app:&AppHandle,mode:&str,query:&str,offset:u32,limit:u32)
    ->Result<GroupPage,String>{
    let conn=database::open(app)?;
    let offset=offset.min(1_000_000);
    let limit=limit.clamp(1,100);
    if query.chars().count()>160{return Err("Filter is too long".into())}
    let (title,artist)=match mode{
      "albums"=>(
        "COALESCE(NULLIF(TRIM(album),''),'Unknown album')",
        "COALESCE(NULLIF(TRIM(artist),''),'Unknown artist')"),
      "artists"=>(
        "COALESCE(NULLIF(TRIM(artist),''),'Unknown artist')",
        "''"),
      _=>return Err("Unsupported group type".into()),
    };
    let needle=format!("%{}%",query.trim().replace('\\',"\\\\")
      .replace('%',"\\%").replace('_',"\\_"));
    let rows_sql=format!(
      "SELECT {title} label,{artist} artist,path FROM library_tracks"
    );
    let grouped=format!(
      "FROM ({rows_sql}) source
       WHERE label LIKE ?1 ESCAPE '\\' COLLATE NOCASE
          OR artist LIKE ?2 ESCAPE '\\' COLLATE NOCASE
       GROUP BY label,artist"
    );
    let total_sql=format!(
      "SELECT COUNT(*) FROM (SELECT label,artist {grouped})"
    );
    let total:i64=conn.query_row(&total_sql,
      rusqlite::params![needle,needle],|r|r.get(0))
      .map_err(|e|format!("Cannot count groups: {e}"))?;
    let sql=format!(
      "SELECT g.label,g.artist,g.number,
              COALESCE(a.artwork_path,t.artwork_path)
       FROM (
         SELECT label,artist,COUNT(*) number,MIN(path) sample_path
         {grouped}
         ORDER BY label COLLATE NOCASE,artist COLLATE NOCASE
         LIMIT ?3 OFFSET ?4
       ) g
       LEFT JOIN library_tracks t ON t.path=g.sample_path
       LEFT JOIN artwork_assignments a ON a.track_path=t.path"
    );
    let mut stmt=conn.prepare(&sql).map_err(|e|e.to_string())?;
    let records=stmt.query_map(rusqlite::params![needle,needle,limit,offset],|row|{
      Ok(GroupSummary{
        title:row.get(0)?,artist:row.get(1)?,count:row.get(2)?,
        artwork_path:row.get(3)?,
      })
    }).map_err(|e|e.to_string())?;
    let mut items=Vec::new();
    for record in records {
      let mut item=record.map_err(|e|e.to_string())?;
      item.artwork_path=item.artwork_path.filter(|p|{
        Path::new(p).is_file()&&app.asset_protocol_scope().allow_file(p).is_ok()
      });
      items.push(item);
    }
    Ok(GroupPage{items,total,offset,limit})
}

#[tauri::command]
pub async fn query_library_groups(app:AppHandle,mode:String,
    query:String,offset:u32,limit:u32)->Result<GroupPage,String>{
    tauri::async_runtime::spawn_blocking(move||groups(&app,&mode,&query,offset,limit))
      .await.map_err(|e|format!("Library group worker failed: {e}"))?
}
