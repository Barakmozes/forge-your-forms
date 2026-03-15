// ============================================
// Secret Encryption — AES-GCM encryption for integration secrets
// Uses Web Crypto API (no external dependencies)
// Encrypts secrets before storing in DB, decrypts when reading
// Format: base64(iv + ciphertext) prefixed with "enc:" marker
// ============================================

const ENCRYPTION_PREFIX = "enc:";
const ENCRYPTION_KEY_SEED = "formforge-integration-secrets-v1";

let cachedKey: CryptoKey | null = null;

async function getEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY_SEED),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  cachedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("formforge-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return cachedKey;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}

export async function encryptSecret(plaintext: string): Promise<string> {
  if (!plaintext || isEncrypted(plaintext)) return plaintext;

  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return ENCRYPTION_PREFIX + arrayBufferToBase64(combined.buffer);
}

export async function decryptSecret(encrypted: string): Promise<string> {
  if (!encrypted || !isEncrypted(encrypted)) return encrypted;

  const key = await getEncryptionKey();
  const combined = new Uint8Array(base64ToArrayBuffer(encrypted.slice(ENCRYPTION_PREFIX.length)));

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 4) return "****";
  return "*".repeat(secret.length - 4) + secret.slice(-4);
}
