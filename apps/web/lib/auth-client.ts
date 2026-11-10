"use client";

import { createAuthClient } from "better-auth/react";

/**
 * The browser client deliberately has no provider credentials or user identity
 * configuration. Better Auth owns the OAuth state and session cookie exchange.
 */
export const authClient = createAuthClient({
  fetchOptions: {
    credentials: "include",
  },
});
