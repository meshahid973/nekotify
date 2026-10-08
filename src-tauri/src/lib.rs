mod database;
mod library;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            database::get_collections,
            database::get_recent,
            database::record_listen,
            database::create_playlist,
            database::delete_playlist,
            database::add_to_playlist,
            database::remove_from_playlist,
            database::toggle_favorite,
            library::load_library,
            library::set_track_artwork,
            library::import_music_folder,
            library::import_art_folder,
            library::import_art_file,
            library::remove_music_folder,
            library::remove_art_source
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run Nekotify");
}
