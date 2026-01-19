/**
 * Credential encryption/decryption utility
 * Uses AES encryption to store Ozon API credentials securely
 */

import { envConfigs } from '@/config';

const ENCRYPTION_KEY = envConfigs.credential_encryption_key || '';

if (!ENCRYPTION_KEY) {
  console.warn('WARNING: CREDENTIAL_ENCRYPTION_KEY is not set in environment variables');
}

export interface OzonCredentialPlain {
  client_id: string;
  api_key: string;
}

/**
 * Simple XOR encryption for fallback (less secure, only for development)
 * NOTE: In production, always use proper AES encryption via crypto-js
 */
function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return Buffer.from(result).toString('base64');
}

function xorDecrypt(encrypted: string, key: string): string {
  const text = Buffer.from(encrypted, 'base64').toString('binary');
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

/**
 * Encrypt credential using AES (via crypto-js if available)
 * Falls back to XOR encryption for development without crypto-js
 */
export function encryptCredential(credential: OzonCredentialPlain): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY is not set');
  }

  const plaintext = JSON.stringify(credential);

  // Try to use crypto-js if available
  try {
    // Dynamic import to avoid build errors if crypto-js is not installed
    const CryptoJS = require('crypto-js');
    const encrypted = CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY);
    return encrypted.toString();
  } catch {
    // Fallback to XOR encryption (less secure, for development only)
    console.warn('crypto-js not available, using fallback encryption (less secure)');
    return xorEncrypt(plaintext, ENCRYPTION_KEY);
  }
}

/**
 * Decrypt credential using AES (via crypto-js if available)
 * Falls back to XOR encryption for development without crypto-js
 */
export function decryptCredential(ciphertext: string): OzonCredentialPlain {
  if (!ENCRYPTION_KEY) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY is not set');
  }

  // Try to use crypto-js if available
  try {
    const CryptoJS = require('crypto-js');
    const decrypted = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

    if (!plaintext) {
      throw new Error('Failed to decrypt credential');
    }

    return JSON.parse(plaintext);
  } catch {
    // Fallback to XOR decryption
    const plaintext = xorDecrypt(ciphertext, ENCRYPTION_KEY);
    return JSON.parse(plaintext);
  }
}

/**
 * Validate credential format
 */
export function validateCredential(credential: unknown): credential is OzonCredentialPlain {
  return (
    typeof credential === 'object' &&
    credential !== null &&
    'client_id' in credential &&
    'api_key' in credential &&
    typeof credential.client_id === 'string' &&
    typeof credential.api_key === 'string'
  );
}
