const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('audiosync-salt-v1'),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function setEncryptedItem(key: string, value: string, secret: string): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await deriveKey(secret);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoder.encode(value));
  const payload = `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(encrypted)))}`;
  localStorage.setItem(key, payload);
}

export async function getEncryptedItem(key: string, secret: string): Promise<string | null> {
  const payload = localStorage.getItem(key);
  if (!payload) return null;
  const [ivB64, dataB64] = payload.split('.');
  if (!ivB64 || !dataB64) return null;

  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(dataB64), (c) => c.charCodeAt(0));
  const cryptoKey = await deriveKey(secret);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, data);
  return decoder.decode(decrypted);
}
