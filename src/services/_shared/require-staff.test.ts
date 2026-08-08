import assert from "node:assert/strict";
import test from "node:test";

import { StaffRole } from "@prisma/client";
import type { Session } from "next-auth";

import {
  requireStaff,
  StaffAuthenticationRequiredError,
} from "./require-staff";

type Dependencies = NonNullable<Parameters<typeof requireStaff>[0]>;

function staffSession(
  id: string,
  role: StaffRole = StaffRole.STAFF,
): Session {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: {
      id,
      name: "Staff Member",
      email: "staff@example.com",
      role,
    },
  };
}

function persistedStaff(
  role: StaffRole = StaffRole.STAFF,
  isActive = true,
) {
  return {
    id: "staff_1",
    name: "Current Staff Name",
    email: "current@example.com",
    role,
    isActive,
  };
}

function createDependencies(overrides: Partial<Dependencies> = {}) {
  const dependencies: Dependencies = {
    getSession: async () => staffSession("staff_1"),
    findStaffById: async () => persistedStaff(),
    ...overrides,
  };

  return dependencies;
}

test("rejects a missing session without querying staff", async () => {
  let lookupCount = 0;

  await assert.rejects(
    requireStaff(
      createDependencies({
        getSession: async () => null,
        findStaffById: async () => {
          lookupCount += 1;
          return persistedStaff();
        },
      }),
    ),
    StaffAuthenticationRequiredError,
  );
  assert.equal(lookupCount, 0);
});

test("rejects a session without a valid staff ID", async () => {
  for (const id of [undefined, ""]) {
    const session = {
      expires: "2099-01-01T00:00:00.000Z",
      user: {
        id,
        name: "Staff Member",
        email: "staff@example.com",
        role: StaffRole.STAFF,
      },
    } as Session;

    await assert.rejects(
      requireStaff(
        createDependencies({
          getSession: async () => session,
        }),
      ),
      StaffAuthenticationRequiredError,
    );
  }
});

test("rejects a session whose persisted staff record is missing", async () => {
  await assert.rejects(
    requireStaff(
      createDependencies({
        findStaffById: async () => null,
      }),
    ),
    StaffAuthenticationRequiredError,
  );
});

test("rejects inactive persisted staff despite a valid JWT session", async () => {
  await assert.rejects(
    requireStaff(
      createDependencies({
        findStaffById: async () => persistedStaff(StaffRole.ADMIN, false),
      }),
    ),
    StaffAuthenticationRequiredError,
  );
});

for (const role of [StaffRole.ADMIN, StaffRole.STAFF]) {
  test(`allows active ${role} and returns only persisted safe identity`, async () => {
    const identity = await requireStaff(
      createDependencies({
        getSession: async () => staffSession("staff_1", role),
        findStaffById: async () => persistedStaff(role),
      }),
    );

    assert.deepEqual(identity, {
      id: "staff_1",
      name: "Current Staff Name",
      email: "current@example.com",
      role,
    });
    assert.deepEqual(Object.keys(identity).sort(), [
      "email",
      "id",
      "name",
      "role",
    ]);
  });
}
