import { describe, expect, it } from "vitest";

import {
  mapRepositoryRequestStatus,
  presentRepositoryRequestError,
  RepositoryRequestError,
} from "./repository-request-error";

describe("repository request error mapping", () => {
  it.each([
    [401, "signed-out"],
    [403, "permission-denied"],
    [404, "not-found"],
    [429, "rate-limit"],
    [503, "setup"],
    [504, "timeout"],
    [500, "provider-failure"],
  ] as const)("maps HTTP %i to %s", (status, kind) => {
    expect(mapRepositoryRequestStatus(status).kind).toBe(kind);
  });

  it("preserves the typed status while keeping the presentation safe", () => {
    const error = new RepositoryRequestError(403);

    expect(error.status).toBe(403);
    expect(presentRepositoryRequestError(error)).toEqual({
      kind: "permission-denied",
      title: "Permission denied",
      message: "You do not have permission to access this repository snapshot.",
    });
  });

  it("does not expose unknown error content", () => {
    expect(
      presentRepositoryRequestError(new Error("provider response contains private data"))
    ).toEqual(
      mapRepositoryRequestStatus(500)
    );
  });
});
