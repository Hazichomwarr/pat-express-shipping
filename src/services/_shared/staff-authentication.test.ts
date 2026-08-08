import assert from "node:assert/strict";
import test from "node:test";

import { StaffRole } from "@prisma/client";

import { authenticateStaffCredentials } from "./staff-authentication";

type Dependencies = NonNullable<
  Parameters<typeof authenticateStaffCredentials>[1]
>;

function activeStaff(overrides: Record<string, unknown> = {}) {
  return {
    id: "staff_1",
    name: "Pat Admin",
    email: "pat@example.com",
    passwordHash: "stored-hash",
    role: StaffRole.ADMIN,
    isActive: true,
    ...overrides,
  };
}

function createDependencies(overrides: Partial<Dependencies> = {}) {
  const dependencies: Dependencies = {
    findStaffByEmail: async () => activeStaff(),
    verifyPassword: async () => true,
    ...overrides,
  };

  return dependencies;
}

test("authenticates valid active staff with a safe identity", async () => {
  const identity = await authenticateStaffCredentials(
    { email: "pat@example.com", password: "valid password" },
    createDependencies(),
  );

  assert.deepEqual(identity, {
    id: "staff_1",
    name: "Pat Admin",
    email: "pat@example.com",
    role: StaffRole.ADMIN,
  });
  assert.equal("passwordHash" in (identity ?? {}), false);
  assert.equal("isActive" in (identity ?? {}), false);
});

test("normalizes email before lookup without changing the password", async () => {
  let receivedEmail: string | undefined;
  let receivedPassword: string | undefined;

  await authenticateStaffCredentials(
    { email: "  PAT@Example.COM  ", password: "  passphrase  " },
    createDependencies({
      findStaffByEmail: async (email) => {
        receivedEmail = email;
        return activeStaff();
      },
      verifyPassword: async (password) => {
        receivedPassword = password;
        return true;
      },
    }),
  );

  assert.equal(receivedEmail, "pat@example.com");
  assert.equal(receivedPassword, "  passphrase  ");
});

test("rejects a wrong password", async () => {
  const identity = await authenticateStaffCredentials(
    { email: "pat@example.com", password: "wrong password" },
    createDependencies({ verifyPassword: async () => false }),
  );

  assert.equal(identity, null);
});

test("rejects unknown email without attempting password verification", async () => {
  let verificationCount = 0;
  const identity = await authenticateStaffCredentials(
    { email: "unknown@example.com", password: "valid password" },
    createDependencies({
      findStaffByEmail: async () => null,
      verifyPassword: async () => {
        verificationCount += 1;
        return true;
      },
    }),
  );

  assert.equal(identity, null);
  assert.equal(verificationCount, 0);
});

test("rejects inactive staff without attempting password verification", async () => {
  let verificationCount = 0;
  const identity = await authenticateStaffCredentials(
    { email: "pat@example.com", password: "valid password" },
    createDependencies({
      findStaffByEmail: async () => activeStaff({ isActive: false }),
      verifyPassword: async () => {
        verificationCount += 1;
        return true;
      },
    }),
  );

  assert.equal(identity, null);
  assert.equal(verificationCount, 0);
});

test("preserves STAFF role and stable staff ID", async () => {
  const identity = await authenticateStaffCredentials(
    { email: "employee@example.com", password: "valid password" },
    createDependencies({
      findStaffByEmail: async () =>
        activeStaff({
          id: "staff_2",
          email: "employee@example.com",
          role: StaffRole.STAFF,
        }),
    }),
  );

  assert.equal(identity?.id, "staff_2");
  assert.equal(identity?.role, StaffRole.STAFF);
});

test("rejects missing or non-string credentials", async () => {
  for (const credentials of [
    undefined,
    null,
    {},
    { email: 123, password: "password" },
    { email: "pat@example.com", password: 123 },
    { email: " ", password: "password" },
    { email: "pat@example.com", password: "" },
  ]) {
    assert.equal(
      await authenticateStaffCredentials(credentials, createDependencies()),
      null,
    );
  }
});
