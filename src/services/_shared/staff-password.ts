import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const HASH_ALGORITHM = "scrypt";
const SALT_LENGTH = 16;
const DERIVED_KEY_LENGTH = 64;
const ENCODED_COMPONENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const scrypt = promisify(scryptCallback);

function encode(value: Buffer): string {
  return value.toString("base64url");
}

function decode(value: string, expectedLength: number): Buffer | null {
  if (!ENCODED_COMPONENT_PATTERN.test(value)) {
    return null;
  }

  const decoded = Buffer.from(value, "base64url");

  if (decoded.length !== expectedLength || encode(decoded) !== value) {
    return null;
  }

  return decoded;
}

export async function hashStaffPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = (await scrypt(
    password,
    salt,
    DERIVED_KEY_LENGTH,
  )) as Buffer;

  return `${HASH_ALGORITHM}$${encode(salt)}$${encode(derivedKey)}`;
}

export async function verifyStaffPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split("$");

  if (parts.length !== 3 || parts[0] !== HASH_ALGORITHM) {
    return false;
  }

  const salt = decode(parts[1], SALT_LENGTH);
  const storedDerivedKey = decode(parts[2], DERIVED_KEY_LENGTH);

  if (!salt || !storedDerivedKey) {
    return false;
  }

  const candidateDerivedKey = (await scrypt(
    password,
    salt,
    storedDerivedKey.length,
  )) as Buffer;

  return timingSafeEqual(storedDerivedKey, candidateDerivedKey);
}
