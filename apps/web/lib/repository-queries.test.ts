import { beforeEach, describe, expect, it, vi } from "vitest";

const fixtureState = vi.hoisted(() => ({
  database: undefined as unknown,
  repositories: [] as Record<string, unknown>[],
  files: [] as Record<string, unknown>[],
}));

vi.mock("server-only", () => ({}));
vi.mock("./db/client", () => ({
  getPlatformDb: () => fixtureState.database,
}));
vi.mock("drizzle-orm", async importOriginal => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    and: (...conditions: unknown[]) => ({ operator: "and", conditions }),
    eq: (column: unknown, value: unknown) => ({ operator: "eq", column, value }),
  };
});

import { importedRepository, repositoryFile } from "./db/schema";
import {
  getOwnedRepository,
  getOwnedRepositoryDetail,
  getOwnedRepositoryFile,
  listOwnedRepositories,
} from "./repository-queries";

type Context = Map<unknown, unknown>;

type FixtureCondition = {
  operator?: string;
  column?: unknown;
  value?: unknown;
  conditions?: unknown[];
};

function rowContext(table: unknown, row: Record<string, unknown>): Context {
  const context: Context = new Map();
  for (const [property, value] of Object.entries(table as Record<string, unknown>)) {
    if (value && typeof value === "object" && "name" in value)
      context.set(value, row[property]);
  }
  return context;
}

function matches(condition: unknown, context: Context): boolean {
  if (!condition || typeof condition !== "object") return false;
  const item = condition as FixtureCondition;
  if (item.operator === "and")
    return (item.conditions ?? []).every(entry => matches(entry, context));
  if (item.operator !== "eq") return false;

  const actual = context.get(item.column);
  const expected =
    item.value && typeof item.value === "object" && context.has(item.value)
      ? context.get(item.value)
      : item.value;
  return actual === expected;
}

function fixtureDatabase() {
  function rowsFor(table: unknown) {
    if (table === importedRepository) return fixtureState.repositories;
    if (table === repositoryFile) return fixtureState.files;
    return [];
  }

  function queryBuilder(selection: unknown): any {
    let sourceTable: unknown;
    let joinTable: unknown;
    let joinCondition: unknown;
    let whereCondition: unknown;
    let rowLimit: number | undefined;

    const builder: any = {
      from(table: unknown) {
        sourceTable = table;
        return builder;
      },
      innerJoin(table: unknown, condition: unknown) {
        joinTable = table;
        joinCondition = condition;
        return builder;
      },
      where(condition: unknown) {
        whereCondition = condition;
        return builder;
      },
      orderBy() {
        return builder;
      },
      limit(limit: number) {
        rowLimit = limit;
        return builder;
      },
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
        let result = rowsFor(sourceTable).map(row => ({
          primary: row,
          context: rowContext(sourceTable, row),
        }));

        if (joinTable) {
          result = result.flatMap(left =>
            rowsFor(joinTable).map(right => {
              const context = new Map(left.context);
              for (const [column, value] of rowContext(joinTable, right))
                context.set(column, value);
              return { primary: left.primary, context };
            })
          );
          result = result.filter(row => matches(joinCondition, row.context));
        }
        if (whereCondition)
          result = result.filter(row => matches(whereCondition, row.context));
        if (rowLimit !== undefined) result = result.slice(0, rowLimit);

        const value =
          selection && typeof selection === "object" && "file" in selection
            ? result.map(row => ({ file: row.primary }))
            : result.map(row => row.primary);
        return Promise.resolve(value).then(resolve, reject);
      },
    };
    return builder;
  }

  return {
    select(selection?: unknown) {
      return queryBuilder(selection);
    },
  };
}

function repository(id: string, userId: string) {
  return {
    id,
    userId,
    githubId: id === "repo-a" ? 10 : 20,
    fullName: `${userId}/${id}`,
    description: null,
    defaultBranch: "main",
    commitSha: "a".repeat(40),
    private: true,
    language: "TypeScript",
    htmlUrl: `https://github.com/${userId}/${id}`,
    importedAt: new Date("2026-11-10T00:00:00.000Z"),
    importedFiles: 1,
    skippedFiles: 0,
    totalBytes: 18,
    snapshotTruncated: false,
  };
}

beforeEach(() => {
  fixtureState.repositories = [
    repository("repo-a", "user-a"),
    repository("repo-b", "user-b"),
  ];
  fixtureState.files = [
    {
      id: "file-a",
      repositoryId: "repo-a",
      path: "src/private.ts",
      bytes: 18,
      language: "typescript",
      content: "synthetic user-a content",
    },
    {
      id: "file-b",
      repositoryId: "repo-b",
      path: "src/private.ts",
      bytes: 18,
      language: "typescript",
      content: "synthetic user-b content",
    },
  ];
  fixtureState.database = fixtureDatabase();
});

describe("repository query tenant isolation", () => {
  it("lists only the authenticated tenant's repositories and hides a foreign repository ID", async () => {
    const listed = await listOwnedRepositories("user-b");

    expect(listed.map(item => item.id)).toEqual(["repo-b"]);
    expect(await getOwnedRepository("user-b", "repo-a")).toBeNull();
    expect(await getOwnedRepositoryDetail("user-b", "repo-a")).toBeNull();
  });

  it("denies a foreign tenant's file while allowing its owner to read the same fixture", async () => {
    expect(
      await getOwnedRepositoryFile("user-b", "repo-a", "src/private.ts")
    ).toBeNull();

    await expect(
      getOwnedRepositoryFile("user-a", "repo-a", "src/private.ts")
    ).resolves.toMatchObject({
      path: "src/private.ts",
      content: "synthetic user-a content",
    });
  });
});
