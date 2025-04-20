import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto"
import { promisify } from "util"

const scryptAsync = promisify(scrypt)

/**
 * Encrypts data using AES-256-GCM
 * @param data Data to encrypt
 * @param key Encryption key
 * @returns Encrypted data with IV and auth tag
 */
export async function encryptData(data: string, key: string): Promise<string> {
  // Generate a random 16-byte initialization vector
  const iv = randomBytes(16)

  // Derive a key from the password
  const derivedKey = (await scryptAsync(key, "salt", 32)) as Buffer

  // Create cipher
  const cipher = createCipheriv("aes-256-gcm", derivedKey, iv)

  // Encrypt the data
  let encrypted = cipher.update(data, "utf8", "hex")
  encrypted += cipher.final("hex")

  // Get the auth tag
  const authTag = cipher.getAuthTag().toString("hex")

  // Return IV, encrypted data, and auth tag as a single string
  return `${iv.toString("hex")}:${encrypted}:${authTag}`
}

/**
 * Decrypts data encrypted with encryptData
 * @param encryptedData Encrypted data from encryptData
 * @param key Encryption key
 * @returns Decrypted data
 */
export async function decryptData(encryptedData: string, key: string): Promise<string> {
  // Split the encrypted data into IV, data, and auth tag
  const [ivHex, data, authTagHex] = encryptedData.split(":")

  // Convert hex strings back to buffers
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

  // Derive the key
  const derivedKey = (await scryptAsync(key, "salt", 32)) as Buffer

  // Create decipher
  const decipher = createDecipheriv("aes-256-gcm", derivedKey, iv)
  decipher.setAuthTag(authTag)

  // Decrypt the data
  let decrypted = decipher.update(data, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

/**
 * Generates a secure random key
 * @returns Random key as hex string
 */
export function generateSecureKey(): string {
  return randomBytes(32).toString("hex")
}

