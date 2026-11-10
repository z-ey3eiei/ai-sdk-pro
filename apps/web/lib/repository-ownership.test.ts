import { describe, expect, it } from "vitest";

type OwnedRow = { userId: string; id: string };
function canReadOwnedRow(row: OwnedRow, authenticatedUserId: string, requestedId: string): boolean {
  return row.userId === authenticatedUserId && row.id === requestedId;
}

describe("repository ownership policy", () => {
  it("rejects a matching repository id belonging to another user", () => {
    const row = { userId: "owner-a", id: "repo-1" };
    expect(canReadOwnedRow(row, "owner-a", "repo-1")).toBe(true);
    expect(canReadOwnedRow(row, "owner-b", "repo-1")).toBe(false);
    expect(canReadOwnedRow(row, "owner-a", "repo-2")).toBe(false);
  });
});
