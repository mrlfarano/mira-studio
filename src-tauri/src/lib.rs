use std::sync::Mutex;
use tauri::Manager;

/// Holds the sidecar child process so we can kill it on shutdown.
struct ServerProcess(Mutex<Option<tauri_plugin_shell::process::CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Spawn the Mira server as a sidecar process.
            // In dev mode the server is started externally; in production
            // Tauri launches it and manages its lifecycle.
            if !cfg!(debug_assertions) {
                let shell = app.shell();
                let server_script = app
                    .path()
                    .resource_dir()
                    .expect("resource dir")
                    .join("server")
                    .join("dist")
                    .join("index.js");

                let (mut _rx, child) = shell
                    .command("node")
                    .args([server_script.to_string_lossy().to_string()])
                    .spawn()
                    .expect("failed to spawn mira server sidecar");

                log::info!("Mira server sidecar spawned (pid: {:?})", child.pid());

                app.manage(ServerProcess(Mutex::new(Some(child))));
            } else {
                app.manage(ServerProcess(Mutex::new(None)));
                log::info!("Dev mode — expecting external server on :3001");
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Kill the sidecar when the main window closes
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<ServerProcess>();
                if let Ok(mut guard) = state.0.lock() {
                    if let Some(child) = guard.take() {
                        let _ = child.kill();
                        log::info!("Mira server sidecar killed");
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Mira Studio");
}
