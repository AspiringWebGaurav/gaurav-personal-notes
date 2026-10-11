// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(unknown_lints)]
#![allow(linker_messages)]

fn main() {
    pc_app_lib::run()
}
