// Prevents console window on Windows across ALL build profiles (debug & release).
#![windows_subsystem = "windows"]
#![allow(unknown_lints)]
#![allow(linker_messages)]

fn main() {
    // 100% silent windowless execution: immediately detach any allocated console
    #[cfg(target_os = "windows")]
    unsafe {
        extern "system" {
            fn FreeConsole() -> i32;
        }
        let _ = FreeConsole();
    }

    pc_app_lib::run()
}

