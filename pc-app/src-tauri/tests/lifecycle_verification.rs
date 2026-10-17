use chrono::Utc;
use std::time::Duration;
use tokio_util::sync::CancellationToken;

fn compute_backoff_delay(consecutive_failures: u32) -> Duration {
    if consecutive_failures == 0 {
        return Duration::from_secs(0);
    }
    // Delay = min(60s, 2 * 2^min(n-1, 5)s) + rand(0, 1000ms)
    let exponent = (consecutive_failures - 1).min(5);
    let base_secs = (2u64 * (1u64 << exponent)).min(60);
    let jitter_ms = (Utc::now().timestamp_subsec_millis() as u64) % 1000;
    Duration::from_millis(base_secs * 1000 + jitter_ms)
}

#[test]
fn test_exponential_backoff_formula_2_to_60s() {
    // n=0 should be 0s
    assert_eq!(compute_backoff_delay(0), Duration::from_secs(0));

    // n=1: 2 * 2^0 = 2s (+ 0..1000ms jitter) -> [2000ms, 3000ms]
    let d1 = compute_backoff_delay(1);
    assert!(d1 >= Duration::from_millis(2000) && d1 <= Duration::from_millis(3000), "n=1 delay {:?}", d1);

    // n=2: 2 * 2^1 = 4s (+ 0..1000ms jitter) -> [4000ms, 5000ms]
    let d2 = compute_backoff_delay(2);
    assert!(d2 >= Duration::from_millis(4000) && d2 <= Duration::from_millis(5000), "n=2 delay {:?}", d2);

    // n=3: 2 * 2^2 = 8s (+ 0..1000ms jitter) -> [8000ms, 9000ms]
    let d3 = compute_backoff_delay(3);
    assert!(d3 >= Duration::from_millis(8000) && d3 <= Duration::from_millis(9000), "n=3 delay {:?}", d3);

    // n=4: 2 * 2^3 = 16s (+ 0..1000ms jitter) -> [16000ms, 17000ms]
    let d4 = compute_backoff_delay(4);
    assert!(d4 >= Duration::from_millis(16000) && d4 <= Duration::from_millis(17000), "n=4 delay {:?}", d4);

    // n=5: 2 * 2^4 = 32s (+ 0..1000ms jitter) -> [32000ms, 33000ms]
    let d5 = compute_backoff_delay(5);
    assert!(d5 >= Duration::from_millis(32000) && d5 <= Duration::from_millis(33000), "n=5 delay {:?}", d5);

    // n=6: (2 * 32).min(60) = 60s (+ 0..1000ms jitter) -> [60000ms, 61000ms]
    let d6 = compute_backoff_delay(6);
    assert!(d6 >= Duration::from_millis(60000) && d6 <= Duration::from_millis(61000), "n=6 delay {:?}", d6);

    // n=10: capped at 60s (+ 0..1000ms jitter) -> [60000ms, 61000ms]
    let d10 = compute_backoff_delay(10);
    assert!(d10 >= Duration::from_millis(60000) && d10 <= Duration::from_millis(61000), "n=10 delay {:?}", d10);

    // n=100: strictly capped at 60s (+ 0..1000ms jitter)
    let d100 = compute_backoff_delay(100);
    assert!(d100 >= Duration::from_millis(60000) && d100 <= Duration::from_millis(61000), "n=100 delay {:?}", d100);
}

#[tokio::test]
async fn test_cancellation_token_preserves_execution_flow() {
    let token = CancellationToken::new();
    let token_clone = token.clone();

    let task = tokio::spawn(async move {
        tokio::select! {
            _ = token_clone.cancelled() => {
                // Signal received cleanly
                true
            }
            _ = tokio::time::sleep(Duration::from_secs(10)) => {
                false
            }
        }
    });

    // Fire cancellation
    token.cancel();

    let was_cancelled = task.await.expect("task join");
    assert!(was_cancelled, "CancellationToken must cleanly break tokio::select loop");
}

#[test]
fn test_sqlite_pragmas_and_wal_checkpoint() {
    let conn = rusqlite::Connection::open_in_memory().expect("open in memory");
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
        CREATE TABLE IF NOT EXISTS test_notes (id TEXT PRIMARY KEY, title TEXT);
        INSERT INTO test_notes VALUES ('1', 'Test Note');
        "#,
    ).expect("execute batch");

    // Test passive checkpoint
    let res: (i32, i32, i32) = conn.query_row(
        "PRAGMA wal_checkpoint(PASSIVE);",
        [],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).expect("wal checkpoint");

    // In-memory SQLite returns (0, 0, 0)
    assert_eq!(res.0, 0, "Passive checkpoint should succeed without busy lock");
}

#[test]
fn test_winreg_in_process_registry_access() {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        // Verify HKCU can be queried in-process with zero subprocess execution
        let res = hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion");
        assert!(res.is_ok(), "HKCU CurrentVersion must be readable in-process");
    }
}
