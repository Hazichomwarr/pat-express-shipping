import assert from "node:assert/strict";
import test from "node:test";

import { StaffRole } from "@prisma/client";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

import { authOptions } from "../../lib/auth";

test("uses Credentials authentication with JWT sessions", () => {
  assert.equal(authOptions.session?.strategy, "jwt");
  assert.equal(authOptions.providers.length, 1);
  assert.equal(authOptions.providers[0].type, "credentials");
});

test("JWT and session callbacks expose only safe staff identity", async () => {
  const jwtCallback = authOptions.callbacks?.jwt as unknown as (parameters: {
    token: JWT;
    user: User;
  }) => Promise<JWT>;
  const sessionCallback = authOptions.callbacks?.session as unknown as (
    parameters: { session: Session; token: JWT },
  ) => Promise<Session>;

  assert.ok(jwtCallback);
  assert.ok(sessionCallback);

  const token = await jwtCallback({
    token: {
      name: "Pat Admin",
      email: "pat@example.com",
      sub: "staff_1",
    },
    user: {
      id: "staff_1",
      name: "Pat Admin",
      email: "pat@example.com",
      role: StaffRole.ADMIN,
    },
  });

  assert.equal(token.staffId, "staff_1");
  assert.equal(token.staffRole, StaffRole.ADMIN);
  assert.equal("passwordHash" in token, false);

  const session = await sessionCallback({
    session: {
      expires: "2099-01-01T00:00:00.000Z",
      user: {
        id: "",
        name: "Pat Admin",
        email: "pat@example.com",
        role: StaffRole.STAFF,
      },
    },
    token,
  });

  assert.deepEqual(session.user, {
    id: "staff_1",
    name: "Pat Admin",
    email: "pat@example.com",
    role: StaffRole.ADMIN,
  });
  assert.equal("passwordHash" in session.user, false);
});
