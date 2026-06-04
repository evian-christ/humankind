// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn get_steam_id64() -> Option<String> {
    let (client, _single_client) = steamworks::Client::init().ok()?;
    Some(client.user().steam_id().raw().to_string())
}

#[tauri::command]
fn get_steam_game_language() -> Option<String> {
    let (client, _single_client) = steamworks::Client::init().ok()?;
    Some(client.apps().current_game_language())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_steam_id64, get_steam_game_language])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
