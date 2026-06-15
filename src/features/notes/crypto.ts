// Using Web Crypto API for client-side AES-GCM encryption

/**
 * Generates a random AES-GCM key and returns it as a hex string.
 */
export async function generateKey(): Promise<{ keyObj: CryptoKey, keyHex: string }> {
  const keyObj = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  
  const exported = await window.crypto.subtle.exportKey("raw", keyObj);
  const keyHex = Array.from(new Uint8Array(exported))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return { keyObj, keyHex };
}

/**
 * Reconstructs a CryptoKey from a hex string.
 */
export async function importKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  return await window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a string. Returns the ciphertext combined with the IV as a base64 string.
 */
export async function encryptText(text: string, keyObj: CryptoKey): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(text);
  
  const ciphertextBuf = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    keyObj,
    encodedText
  );
  
  // Combine IV and ciphertext into one array
  const combined = new Uint8Array(iv.length + ciphertextBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertextBuf), iv.length);
  
  // Convert to base64
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

/**
 * Decrypts a base64 string (which contains IV + ciphertext) back to text.
 */
export async function decryptText(base64Ciphertext: string, keyObj: CryptoKey): Promise<string> {
  const combinedStr = atob(base64Ciphertext);
  const combined = new Uint8Array(combinedStr.length);
  for (let i = 0; i < combinedStr.length; i++) {
    combined[i] = combinedStr.charCodeAt(i);
  }
  
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    keyObj,
    ciphertext
  );
  
  return new TextDecoder().decode(decryptedBuf);
}
