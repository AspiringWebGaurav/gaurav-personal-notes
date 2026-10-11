pub mod migrations;

use parking_lot::Mutex;
use rusqlite::{Connection, Result};
use std::path::{Path, PathBuf};
use std::sync::Arc;

#[derive(Clone)]
pub struct DatabaseManager {
    conn: Arc<Mutex<Connection>>,
    db_path: Option<PathBuf>,
}

impl DatabaseManager {
    pub fn new_in_memory() -> Result<Self> {
        let mut conn = Connection::open_in_memory()?;
        Self::configure_pragmas(&mut conn)?;
        migrations::run_migrations(&mut conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: None,
        })
    }

    pub fn new_at_path<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path_ref = path.as_ref();
        if let Some(parent) = path_ref.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let mut conn = Connection::open(path_ref)?;
        Self::configure_pragmas(&mut conn)?;
        migrations::run_migrations(&mut conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: Some(path_ref.to_path_buf()),
        })
    }

    fn configure_pragmas(conn: &mut Connection) -> Result<()> {
        conn.execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA foreign_keys = ON;
            PRAGMA busy_timeout = 5000;
            "#,
        )?;
        Ok(())
    }

    pub fn get_connection(&self) -> Arc<Mutex<Connection>> {
        Arc::clone(&self.conn)
    }

    pub fn path(&self) -> Option<&PathBuf> {
        self.db_path.as_ref()
    }
}
