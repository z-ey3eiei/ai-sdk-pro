import {
  bigint,
  boolean,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const appSchema = pgSchema("aisdk_pro");
export const authSchema = appSchema;

const dateColumn = (name: string) =>
  timestamp(name, { mode: "date", withTimezone: true });

export const user = authSchema.table(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: dateColumn("created_at").notNull(),
    updatedAt: dateColumn("updated_at").notNull(),
  },
  table => [uniqueIndex("user_email_idx").on(table.email)]
);

export const session = authSchema.table(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: dateColumn("expires_at").notNull(),
    token: text("token").notNull(),
    createdAt: dateColumn("created_at").notNull(),
    updatedAt: dateColumn("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  table => [
    uniqueIndex("session_token_idx").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ]
);

export const account = authSchema.table(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: dateColumn("access_token_expires_at"),
    refreshTokenExpiresAt: dateColumn("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: dateColumn("created_at").notNull(),
    updatedAt: dateColumn("updated_at").notNull(),
  },
  table => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_idx").on(
      table.providerId,
      table.accountId
    ),
  ]
);

export const verification = authSchema.table("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: dateColumn("expires_at").notNull(),
  createdAt: dateColumn("created_at").notNull(),
  updatedAt: dateColumn("updated_at").notNull(),
});

export const importedRepository = appSchema.table(
  "imported_repository",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    githubId: bigint("github_id", { mode: "number" }).notNull(),
    fullName: text("full_name").notNull(),
    description: text("description"),
    defaultBranch: text("default_branch").notNull(),
    commitSha: text("commit_sha").notNull(),
    private: boolean("private").notNull(),
    language: text("language"),
    htmlUrl: text("html_url").notNull(),
    importedAt: dateColumn("imported_at").notNull(),
    importedFiles: integer("imported_files").notNull(),
    skippedFiles: integer("skipped_files").notNull(),
    totalBytes: integer("total_bytes").notNull(),
    snapshotTruncated: boolean("snapshot_truncated").notNull(),
  },
  table => [
    uniqueIndex("imported_repository_user_github_idx").on(
      table.userId,
      table.githubId
    ),
    index("imported_repository_user_imported_at_idx").on(
      table.userId,
      table.importedAt
    ),
  ]
);

export const repositoryFile = appSchema.table(
  "repository_file",
  {
    id: text("id").primaryKey(),
    repositoryId: text("repository_id")
      .notNull()
      .references(() => importedRepository.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    bytes: integer("bytes").notNull(),
    language: text("language"),
    content: text("content").notNull(),
  },
  table => [
    uniqueIndex("repository_file_repository_path_idx").on(
      table.repositoryId,
      table.path
    ),
    index("repository_file_repository_idx").on(table.repositoryId),
  ]
);

export const appTables = { importedRepository, repositoryFile };
export const authTables = { user, session, account, verification };
export const dbSchema = { ...authTables, ...appTables };
