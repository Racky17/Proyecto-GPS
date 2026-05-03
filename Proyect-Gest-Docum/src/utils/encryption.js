const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const toBase64 = (buffer) => {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

const fromBase64 = (base64) => {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export const generateSalt = () => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  return toBase64(salt)
}

export const deriveKey = async (password, saltBase64) => {
  const passwordBytes = textEncoder.encode(password)
  const salt = fromBase64(saltBase64)
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 250000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )

  return key
}

export const exportCryptoKey = async (key) => {
  const raw = await window.crypto.subtle.exportKey('raw', key)
  return toBase64(raw)
}

export const importCryptoKey = async (keyBase64) => {
  const raw = fromBase64(keyBase64)
  return window.crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

export const encryptText = async (key, text) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encoded = textEncoder.encode(text)
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  )

  const combined = new Uint8Array(iv.byteLength + cipherBuffer.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(cipherBuffer), iv.byteLength)

  return toBase64(combined.buffer)
}

export const decryptText = async (key, dataBase64) => {
  const combined = new Uint8Array(fromBase64(dataBase64))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  )
  return textDecoder.decode(decryptedBuffer)
}

export const storeEncryptionKey = async (key, saltBase64) => {
  const keyBase64 = await exportCryptoKey(key)
  sessionStorage.setItem('encryptionKey', keyBase64)
  sessionStorage.setItem('encryptionSalt', saltBase64)
}

export const loadStoredKey = async () => {
  const keyBase64 = sessionStorage.getItem('encryptionKey')
  if (!keyBase64) {
    return null
  }
  return importCryptoKey(keyBase64)
}

export const clearStoredEncryption = () => {
  sessionStorage.removeItem('encryptionKey')
  sessionStorage.removeItem('encryptionSalt')
}

export const getStoredSalt = () => sessionStorage.getItem('encryptionSalt')
