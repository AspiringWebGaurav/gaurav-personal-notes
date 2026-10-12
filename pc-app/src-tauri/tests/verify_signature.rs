use std::fs;
use std::path::PathBuf;
use minisign_verify::{PublicKey, Signature};

#[test]
fn test_verify_tauri_updater_signature() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    
    // 1. Read public key from tauri.conf.json
    let conf_path = manifest_dir.join("tauri.conf.json");
    let conf_str = fs::read_to_string(&conf_path).expect("Read tauri.conf.json");
    let conf_json: serde_json::Value = serde_json::from_str(&conf_str).expect("Parse tauri.conf.json");
    
    let pubkey_str = conf_json["plugins"]["updater"]["pubkey"]
        .as_str()
        .expect("Extract pubkey string");
    
    // Tauri v2 stores the pubkey string either as base64 or decoded text
    let public_key = if let Ok(decoded_bytes) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, pubkey_str.trim()) {
        if let Ok(decoded_str) = String::from_utf8(decoded_bytes) {
            PublicKey::decode(&decoded_str).or_else(|_| PublicKey::decode(pubkey_str))
        } else {
            PublicKey::decode(pubkey_str)
        }
    } else {
        PublicKey::decode(pubkey_str)
    }.expect("Parse Minisign public key");
    
    let version_str = conf_json["version"]
        .as_str()
        .expect("Extract version string");

    // 2. Read generated artifact and signature
    let bundle_dir = manifest_dir.join("target").join("release").join("bundle").join("nsis");
    let bin_name = format!("Gaurav Personal Notes_{}_x64-setup.exe", version_str);
    let sig_name = format!("{}.sig", bin_name);
    let bin_path = bundle_dir.join(&bin_name);
    let sig_path = bundle_dir.join(&sig_name);
    
    assert!(bin_path.exists(), "Binary installer must exist at {:?}", bin_path);
    assert!(sig_path.exists(), "Signature must exist at {:?}", sig_path);
    
    let sig_raw = fs::read_to_string(&sig_path).expect("Read signature file");
    let sig_str = if let Ok(decoded_bytes) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, sig_raw.trim()) {
        if let Ok(decoded_s) = String::from_utf8(decoded_bytes) {
            decoded_s
        } else {
            sig_raw
        }
    } else {
        sig_raw
    };

    let signature = Signature::decode(&sig_str).expect("Decode Minisign signature");
    
    let bin_bytes = fs::read(&bin_path).expect("Read installer binary bytes");
    
    // 3. Cryptographically verify signature against binary
    let verify_result = public_key.verify(&bin_bytes, &signature, false);
    
    match verify_result {
        Ok(()) => {
            println!("\n=======================================================");
            println!(" CRYPTOGRAPHIC VERIFICATION PASSED!");
            println!(" Binary:    {}", bin_path.display());
            println!(" Size:      {} bytes", bin_bytes.len());
            println!(" Signature: MATCHES Minisign public key in tauri.conf.json");
            println!("=======================================================\n");
        }
        Err(e) => {
            panic!("Signature verification failed: {:?}", e);
        }
    }
}
