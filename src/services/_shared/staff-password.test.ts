import assert from "node:assert/strict";
import test from "node:test";

import {
  hashStaffPassword,
  verifyStaffPassword,
} from "./staff-password";

const PASSWORD = "correct horse battery staple";

test("hashes staff passwords without retaining plaintext", async () => {
  const hash = await hashStaffPassword(PASSWORD);

  assert.notEqual(hash, PASSWORD);
  assert.equal(hash.includes(PASSWORD), false);
  assert.equal(hash.startsWith("scrypt$"), true);
});

test("uses a unique random salt for every password hash", async () => {
  const [firstHash, secondHash] = await Promise.all([
    hashStaffPassword(PASSWORD),
    hashStaffPassword(PASSWORD),
  ]);

  assert.notEqual(firstHash, secondHash);
});

test("verifies the correct password", async () => {
  const hash = await hashStaffPassword(PASSWORD);

  assert.equal(await verifyStaffPassword(PASSWORD, hash), true);
});

test("rejects an incorrect password through the timing-safe path", async () => {
  const hash = await hashStaffPassword(PASSWORD);

  assert.equal(await verifyStaffPassword("incorrect password", hash), false);
});

test("rejects empty and malformed stored hashes without throwing", async () => {
  for (const malformedHash of [
    "",
    "plaintext",
    "scrypt$$",
    "scrypt$invalid!salt$invalid!key",
    "scrypt$c2hvcnQ$c2hvcnQ",
    "bcrypt$not-supported$not-supported",
    "scrypt$too$many$parts",
  ]) {
    assert.equal(await verifyStaffPassword(PASSWORD, malformedHash), false);
  }
});
