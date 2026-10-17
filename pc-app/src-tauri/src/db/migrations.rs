use rusqlite::{Connection, Result};

pub struct Migration {
    pub version: i32,
    pub description: &'static str,
    pub sql: &'static str,
}

pub const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        description: "001_initial_core_schema",
        sql: r#"
        -- 1. Main notes table
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY NOT NULL,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL DEFAULT 'Untitled Note',
            content TEXT NOT NULL DEFAULT '',
            word_count INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            remote_updated_at INTEGER NOT NULL DEFAULT 0,
            sync_version INTEGER NOT NULL DEFAULT 1,
            sync_state TEXT NOT NULL DEFAULT 'synced',
            is_deleted INTEGER NOT NULL DEFAULT 0,
            deleted_at INTEGER DEFAULT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_notes_user_archive ON notes(user_id, is_archived, is_deleted);
        CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notes_sync_state ON notes(sync_state);

        -- 2. SQLite FTS5 Virtual Table for Full-Text Search
        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
            id UNINDEXED,
            title,
            content,
            tokenize='porter unicode61'
        );

        -- 3. Automatic Triggers to maintain FTS index consistency
        CREATE TRIGGER IF NOT EXISTS trg_notes_after_insert AFTER INSERT ON notes BEGIN
            INSERT INTO notes_fts(id, title, content)
            VALUES (new.id, new.title, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS trg_notes_after_update AFTER UPDATE ON notes BEGIN
            DELETE FROM notes_fts WHERE id = old.id;
            INSERT INTO notes_fts(id, title, content)
            VALUES (new.id, new.title, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS trg_notes_after_delete AFTER DELETE ON notes BEGIN
            DELETE FROM notes_fts WHERE id = old.id;
        END;

        -- 4. Durable Sync Queue Table
        CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY NOT NULL,
            note_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            retry_count INTEGER NOT NULL DEFAULT 0,
            last_error TEXT DEFAULT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);

        -- 5. Sync metadata
        CREATE TABLE IF NOT EXISTS sync_metadata (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );

        -- 6. Application preferences
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );
        "#,
    },
    Migration {
        version: 2,
        description: "002_crash_telemetry_schema",
        sql: r#"
        CREATE TABLE IF NOT EXISTS app_crash_telemetry (
            id TEXT PRIMARY KEY NOT NULL,
            timestamp INTEGER NOT NULL,
            reason TEXT NOT NULL,
            trace_dump TEXT,
            recovered INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_crash_telemetry_time ON app_crash_telemetry(timestamp DESC);
        "#,
    },
];

pub fn run_migrations(conn: &mut Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS _schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER NOT NULL
        );
        "#,
    )?;

    for migration in MIGRATIONS {
        let exists = {
            let mut stmt = conn.prepare("SELECT 1 FROM _schema_migrations WHERE version = ?1")?;
            stmt.exists([migration.version])?
        };

        if !exists {
            let tx = conn.transaction()?;
            tx.execute_batch(migration.sql)?;
            tx.execute(
                "INSERT INTO _schema_migrations (version, applied_at) VALUES (?1, ?2)",
                rusqlite::params![migration.version, chrono::Utc::now().timestamp_millis()],
            )?;
            tx.commit()?;
        }
    }

    Ok(())
}
