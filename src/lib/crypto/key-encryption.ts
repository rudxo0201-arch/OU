/**
 * AES-256-GCM 암호화/복호화 — 회원 외부 LLM API 키 저장용
 *
 * 환경변수: LLM_KEY_ENCRYPTION_SECRET (64자 hex = 32바이트)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getSecret(): Buffer {
  const hex = process.env.LLM_KEY_ENCRYPTION_SECRET;
  if (!hex || hex.length !== 64) {
    throw new Error('LLM_KEY_ENCRYPTION_SECRET must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

export function encrypt(plainText: string): { encrypted: string; iv: string; authTag: string } {
  const key = getSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

export function decrypt(encrypted: string, iv: string, authTag: string): string {
  const key = getSecret();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
