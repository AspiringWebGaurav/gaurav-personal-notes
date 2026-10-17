use std::collections::VecDeque;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};

/// Maximum entries retained in the zero-allocation circular trace buffer
const TRACE_BUFFER_CAPACITY: usize = 128;

/// Sliding window duration for crash loop detection (60 seconds)
const CRASH_WINDOW_MS: u64 = 60_000;

/// Maximum crashes allowed within the sliding window before the circuit breaker trips
const MAX_CRASH_THRESHOLD: usize = 3;

/// Categories for granular lifecycle tracking
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TraceCategory {
    Boot,
    Lifecycle,
    Database,
    Sync,
    Update,
    Health,
    Panic,
}

impl TraceCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Boot => "BOOT",
            Self::Lifecycle => "LIFECYCLE",
            Self::Database => "DATABASE",
            Self::Sync => "SYNC",
            Self::Update => "UPDATE",
            Self::Health => "HEALTH",
            Self::Panic => "PANIC",
        }
    }
}

/// Lightweight snapshot of a system trace event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraceEvent {
    pub id: u64,
    pub timestamp_ms: u64,
    pub category: String,
    pub message: String,
}

/// High-Performance O(1) Circular Ring Buffer Data Structure (DSA)
pub struct CircularRingBuffer {
    buffer: Vec<Option<TraceEvent>>,
    capacity: usize,
    head: usize,
    tail: usize,
    size: usize,
    counter: AtomicU64,
}

impl CircularRingBuffer {
    pub fn new(capacity: usize) -> Self {
        let mut buffer = Vec::with_capacity(capacity);
        for _ in 0..capacity {
            buffer.push(None);
        }
        Self {
            buffer,
            capacity,
            head: 0,
            tail: 0,
            size: 0,
            counter: AtomicU64::new(1),
        }
    }

    /// Pushes an event in O(1) time without heap re-allocation
    pub fn push(&mut self, category: &str, message: String) {
        let id = self.counter.fetch_add(1, Ordering::Relaxed);
        let timestamp_ms = chrono::Utc::now().timestamp_millis() as u64;

        let event = TraceEvent {
            id,
            timestamp_ms,
            category: category.to_string(),
            message,
        };

        if self.size == self.capacity {
            // Overwrite oldest item at tail
            self.buffer[self.tail] = Some(event);
            self.tail = (self.tail + 1) % self.capacity;
            self.head = (self.head + 1) % self.capacity;
        } else {
            self.buffer[self.head] = Some(event);
            self.head = (self.head + 1) % self.capacity;
            self.size += 1;
        }
    }

    /// Retrieves chronological snapshot of trace events in O(N)
    pub fn snapshot(&self) -> Vec<TraceEvent> {
        let mut items = Vec::with_capacity(self.size);
        let mut idx = self.tail;
        for _ in 0..self.size {
            if let Some(ref item) = self.buffer[idx] {
                items.push(item.clone());
            }
            idx = (idx + 1) % self.capacity;
        }
        items
    }
}

// Global In-Memory Ring Buffer Singleton using standard library OnceLock
static GLOBAL_TRACE_BUFFER: std::sync::OnceLock<Arc<Mutex<CircularRingBuffer>>> = std::sync::OnceLock::new();

fn get_trace_buffer() -> &'static Arc<Mutex<CircularRingBuffer>> {
    GLOBAL_TRACE_BUFFER.get_or_init(|| {
        Arc::new(Mutex::new(CircularRingBuffer::new(TRACE_BUFFER_CAPACITY)))
    })
}

/// Records an operational event into the in-memory circular ring buffer
pub fn record_trace(category: &str, message: impl Into<String>) {
    let msg = message.into();
    #[cfg(debug_assertions)]
    eprintln!("[GPN Trace::{}] {}", category, msg);
    get_trace_buffer().lock().push(category, msg);
}

/// Retrieves chronological traces for telemetry or UI diagnostics
pub fn get_recent_traces() -> Vec<TraceEvent> {
    get_trace_buffer().lock().snapshot()
}

/// Crash record structure persisted across launches
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrashRecord {
    pub timestamp_ms: u64,
    pub reason: String,
    pub location: Option<String>,
    pub traces: Vec<TraceEvent>,
}

/// Sliding-Window Crash State persisted in temp directory
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct CrashWindowState {
    pub crash_timestamps: VecDeque<u64>,
}

fn get_supervisor_temp_dir() -> PathBuf {
    let dir = std::env::temp_dir().join("com.gpn.desktop").join("supervisor");
    let _ = fs::create_dir_all(&dir);
    dir
}

fn get_crash_window_file() -> PathBuf {
    get_supervisor_temp_dir().join("crash_window.json")
}

fn get_last_crash_file() -> PathBuf {
    get_supervisor_temp_dir().join("last_crash.json")
}

/// Registers a crash event in the sliding window and evaluates circuit breaker state
pub fn record_crash_in_sliding_window(reason: &str, location: Option<String>) -> bool {
    let now = chrono::Utc::now().timestamp_millis() as u64;
    let window_file = get_crash_window_file();

    let mut state: CrashWindowState = fs::read_to_string(&window_file)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    // Prune events outside the 60s sliding window
    while let Some(&front) = state.crash_timestamps.front() {
        if now.saturating_sub(front) > CRASH_WINDOW_MS {
            state.crash_timestamps.pop_front();
        } else {
            break;
        }
    }

    state.crash_timestamps.push_back(now);

    // Save updated window
    if let Ok(serialized) = serde_json::to_string(&state) {
        let _ = fs::write(&window_file, serialized);
    }

    // Persist detailed post-mortem dump with ring buffer snapshot
    let traces = get_recent_traces();
    let crash_record = CrashRecord {
        timestamp_ms: now,
        reason: reason.to_string(),
        location,
        traces,
    };
    if let Ok(dump_json) = serde_json::to_string_pretty(&crash_record) {
        let _ = fs::write(get_last_crash_file(), dump_json);
    }

    // Circuit Breaker: returns true if crash threshold exceeded
    state.crash_timestamps.len() >= MAX_CRASH_THRESHOLD
}

/// Clears the crash sliding window upon achieving a clean stable run
pub fn reset_crash_window() {
    let window_file = get_crash_window_file();
    if window_file.exists() {
        let _ = fs::remove_file(window_file);
    }
}

/// Checks if there was a previous crash and writes it to SQLite telemetry if available
pub fn inspect_and_store_previous_crash(conn_guard: &rusqlite::Connection) {
    let last_crash_file = get_last_crash_file();
    if last_crash_file.exists() {
        if let Ok(content) = fs::read_to_string(&last_crash_file) {
            if let Ok(crash) = serde_json::from_str::<CrashRecord>(&content) {
                let crash_id = format!("crash_{}", crash.timestamp_ms);
                let trace_json = serde_json::to_string(&crash.traces).unwrap_or_default();
                let _ = conn_guard.execute(
                    "INSERT OR IGNORE INTO app_crash_telemetry (id, timestamp, reason, trace_dump, recovered)
                     VALUES (?1, ?2, ?3, ?4, 1)",
                    rusqlite::params![crash_id, crash.timestamp_ms as i64, crash.reason, trace_json],
                );
            }
        }
        // Remove processed crash file
        let _ = fs::remove_file(last_crash_file);
    }
}

/// Installs the global Panic Hook and Crash Supervisor
pub fn init_panic_supervisor() {
    record_trace("BOOT", "Initializing Algorithmic Self-Healing Supervisor");

    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        let payload = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unhandled Application Panic".to_string()
        };

        let location = panic_info
            .location()
            .map(|loc| format!("{}:{}:{}", loc.file(), loc.line(), loc.column()));

        record_trace(
            "PANIC",
            format!("CRITICAL: {} (at {:?})", payload, location),
        );

        let circuit_broken = record_crash_in_sliding_window(&payload, location.clone());

        #[cfg(target_os = "windows")]
        if circuit_broken {
            eprintln!("[Supervisor] CIRCUIT BREAKER TRIPPED (>=3 crashes in 60s)! Triggering automatic atomic rollback to safe fallback...");
            if let Ok(current_exe) = std::env::current_exe() {
                if let Some(parent) = current_exe.parent() {
                    if let Some(file_name) = current_exe.file_name() {
                        let name_str = file_name.to_string_lossy();
                        let old_exe = parent.join(format!("{}.old", name_str));
                        let bad_exe = parent.join(format!("{}.bad", name_str));
                        if old_exe.exists() {
                            let _ = fs::rename(&current_exe, &bad_exe);
                            let _ = fs::rename(&old_exe, &current_exe);
                            use std::os::windows::process::CommandExt;
                            let _ = std::process::Command::new(&current_exe)
                                .args(["--update-failed-recovered", "--foreground"])
                                .creation_flags(0x08000000) // CREATE_NO_WINDOW
                                .spawn();
                        }
                    }
                }
            }
        }

        default_hook(panic_info);
    }));
}

/// Verifies initial application startup stability and clears the crash loop sliding window
pub fn spawn_health_monitor(db_manager: crate::db::DatabaseManager) {
    tauri::async_runtime::spawn(async move {
        // Allow app to settle on boot (10 seconds stability window)
        tokio::time::sleep(std::time::Duration::from_secs(10)).await;

        // Perform one-time SQLite connection verification on boot
        let conn = db_manager.get_connection();
        let is_alive = {
            let guard = conn.lock();
            guard.query_row("SELECT 1", [], |_| Ok(())).is_ok()
        };

        if is_alive {
            reset_crash_window();
            record_trace("HEALTH", "Application stability window verified (healthy)");
        } else {
            record_trace("DATABASE", "WARNING: Initial SQLite connection check failed on boot!");
        }

        // Job complete. Worker cleanly exits. Zero periodic polling, zero CPU interrupts.
    });
}
