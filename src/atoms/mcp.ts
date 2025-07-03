import { atom } from "jotai";
import { atomWithRefresh } from "jotai/utils";

export interface MCPServer {
  id: number;
  name: string;
  description?: string;
  transport_type: "stdio" | "http" | "websocket";
  command?: string;
  args?: string[];
  url?: string;
  env_vars?: Record<string, string>;
  enabled: boolean;
  status: "connecting" | "connected" | "disconnected" | "error";
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MCPServerTool {
  id: number;
  serverId: number;
  name: string;
  description?: string;
  inputSchema?: any;
  lastSyncedAt?: Date;
}

export interface MCPServerResource {
  id: number;
  serverId: number;
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
  lastSyncedAt?: Date;
}

export interface MCPServerWithCapabilities extends MCPServer {
  tools: MCPServerTool[];
  resources: MCPServerResource[];
}

// Atom for all MCP servers
export const mcpServersAtom = atomWithRefresh(async () => {
  const servers = await window.electron.ipcRenderer.invoke("mcp:list-servers");
  return servers as MCPServer[];
});

// Atom for available MCP tools from all connected servers
export const mcpToolsAtom = atom(async (get) => {
  const servers = await get(mcpServersAtom);
  const connectedServers = servers.filter(server => server.status === "connected");
  
  const allTools: (MCPServerTool & { serverName: string })[] = [];
  
  for (const server of connectedServers) {
    try {
      const serverDetail = await window.electron.ipcRenderer.invoke("mcp:get-server", server.id);
      const tools = serverDetail.tools || [];
      allTools.push(...tools.map((tool: MCPServerTool) => ({ ...tool, serverName: server.name })));
    } catch (error) {
      console.error(`Failed to get tools for server ${server.name}:`, error);
    }
  }
  
  return allTools;
});

// Atom for available MCP resources from all connected servers
export const mcpResourcesAtom = atom(async (get) => {
  const servers = await get(mcpServersAtom);
  const connectedServers = servers.filter(server => server.status === "connected");
  
  const allResources: (MCPServerResource & { serverName: string })[] = [];
  
  for (const server of connectedServers) {
    try {
      const serverDetail = await window.electron.ipcRenderer.invoke("mcp:get-server", server.id);
      const resources = serverDetail.resources || [];
      allResources.push(...resources.map((resource: MCPServerResource) => ({ ...resource, serverName: server.name })));
    } catch (error) {
      console.error(`Failed to get resources for server ${server.name}:`, error);
    }
  }
  
  return allResources;
});

// Atom for MCP server status updates
export const mcpServerStatusAtom = atom<Record<number, { status: string; error?: string }>>({});

// Helper functions
export const mcpServerActions = {
  async createServer(server: Omit<MCPServer, "id" | "status" | "createdAt" | "updatedAt">) {
    return await window.electron.ipcRenderer.invoke("mcp:create-server", server);
  },
  
  async updateServer(serverId: number, updates: Partial<MCPServer>) {
    return await window.electron.ipcRenderer.invoke("mcp:update-server", serverId, updates);
  },
  
  async deleteServer(serverId: number) {
    return await window.electron.ipcRenderer.invoke("mcp:delete-server", serverId);
  },
  
  async connectServer(serverId: number) {
    return await window.electron.ipcRenderer.invoke("mcp:connect-server", serverId);
  },
  
  async disconnectServer(serverId: number) {
    return await window.electron.ipcRenderer.invoke("mcp:disconnect-server", serverId);
  },
  
  async executeTool(serverId: number, toolName: string, args: any) {
    return await window.electron.ipcRenderer.invoke("mcp:execute-tool", serverId, toolName, args);
  },
  
  async readResource(serverId: number, uri: string) {
    return await window.electron.ipcRenderer.invoke("mcp:read-resource", serverId, uri);
  },
  
  async getServerDetail(serverId: number) {
    return await window.electron.ipcRenderer.invoke("mcp:get-server", serverId) as MCPServerWithCapabilities;
  },
};

// Predefined MCP server templates for easy setup
export const mcpServerTemplates = [
  {
    name: "File System",
    description: "Access and manipulate files on your local system",
    transport_type: "stdio" as const,
    command: "npx",
    args: ["@modelcontextprotocol/server-filesystem"],
    env_vars: {},
    enabled: true,
  },
  {
    name: "Git",
    description: "Access Git repositories and version control",
    transport_type: "stdio" as const,
    command: "npx",
    args: ["@modelcontextprotocol/server-git"],
    env_vars: {},
    enabled: true,
  },
  {
    name: "GitHub",
    description: "Access GitHub repositories and operations",
    transport_type: "stdio" as const,
    command: "npx",
    args: ["@modelcontextprotocol/server-github"],
    env_vars: { GITHUB_PERSONAL_ACCESS_TOKEN: "" },
    enabled: true,
  },
  {
    name: "PostgreSQL",
    description: "Query and manage PostgreSQL databases",
    transport_type: "stdio" as const,
    command: "npx",
    args: ["@modelcontextprotocol/server-postgres"],
    env_vars: { POSTGRES_CONNECTION_STRING: "" },
    enabled: true,
  },
  {
    name: "Google Drive",
    description: "Access and manage Google Drive files",
    transport_type: "stdio" as const,
    command: "npx",
    args: ["@modelcontextprotocol/server-gdrive"],
    env_vars: { GDRIVE_CLIENT_ID: "", GDRIVE_CLIENT_SECRET: "" },
    enabled: true,
  },
  {
    name: "Slack",
    description: "Send messages and access Slack workspaces",
    transport_type: "stdio" as const,
    command: "npx",
    args: ["@modelcontextprotocol/server-slack"],
    env_vars: { SLACK_BOT_TOKEN: "" },
    enabled: true,
  },
  {
    name: "Puppeteer",
    description: "Web scraping and browser automation",
    transport_type: "stdio" as const,
    command: "npx",
    args: ["@modelcontextprotocol/server-puppeteer"],
    env_vars: {},
    enabled: true,
  },
];