import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const apps = sqliteTable("apps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  path: text("path").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  githubOrg: text("github_org"),
  githubRepo: text("github_repo"),
  githubBranch: text("github_branch"),
  supabaseProjectId: text("supabase_project_id"),
  chatContext: text("chat_context", { mode: "json" }),
});

export const chats = sqliteTable("chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  title: text("title"),
  initialCommitHash: text("initial_commit_hash"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  approvalState: text("approval_state", {
    enum: ["approved", "rejected"],
  }),
  commitHash: text("commit_hash"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Define relations
export const appsRelations = relations(apps, ({ many }) => ({
  chats: many(chats),
}));

export const chatsRelations = relations(chats, ({ many, one }) => ({
  messages: many(messages),
  app: one(apps, {
    fields: [chats.appId],
    references: [apps.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

export const language_model_providers = sqliteTable(
  "language_model_providers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    api_base_url: text("api_base_url").notNull(),
    env_var_name: text("env_var_name"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
);

export const language_models = sqliteTable("language_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayName: text("display_name").notNull(),
  apiName: text("api_name").notNull(),
  builtinProviderId: text("builtin_provider_id"),
  customProviderId: text("custom_provider_id").references(
    () => language_model_providers.id,
    { onDelete: "cascade" },
  ),
  description: text("description"),
  max_output_tokens: integer("max_output_tokens"),
  context_window: integer("context_window"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Define relations for new tables
export const languageModelProvidersRelations = relations(
  language_model_providers,
  ({ many }) => ({
    languageModels: many(language_models),
  }),
);

export const languageModelsRelations = relations(
  language_models,
  ({ one }) => ({
    provider: one(language_model_providers, {
      fields: [language_models.customProviderId],
      references: [language_model_providers.id],
    }),
  }),
);

// MCP (Model Context Protocol) Server tables
export const mcp_servers = sqliteTable("mcp_servers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  transport_type: text("transport_type", { enum: ["stdio", "http", "websocket"] }).notNull(),
  command: text("command"), // For stdio transport
  args: text("args", { mode: "json" }), // Array of arguments for stdio
  url: text("url"), // For http/websocket transport
  env_vars: text("env_vars", { mode: "json" }), // Environment variables as JSON object
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const mcp_server_tools = sqliteTable("mcp_server_tools", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serverId: integer("server_id")
    .notNull()
    .references(() => mcp_servers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  inputSchema: text("input_schema", { mode: "json" }),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
});

export const mcp_server_resources = sqliteTable("mcp_server_resources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serverId: integer("server_id")
    .notNull()
    .references(() => mcp_servers.id, { onDelete: "cascade" }),
  uri: text("uri").notNull(),
  name: text("name"),
  description: text("description"),
  mimeType: text("mime_type"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
});

// Define relations for MCP tables
export const mcpServersRelations = relations(mcp_servers, ({ many }) => ({
  tools: many(mcp_server_tools),
  resources: many(mcp_server_resources),
}));

export const mcpServerToolsRelations = relations(mcp_server_tools, ({ one }) => ({
  server: one(mcp_servers, {
    fields: [mcp_server_tools.serverId],
    references: [mcp_servers.id],
  }),
}));

export const mcpServerResourcesRelations = relations(mcp_server_resources, ({ one }) => ({
  server: one(mcp_servers, {
    fields: [mcp_server_resources.serverId],
    references: [mcp_servers.id],
  }),
}));
