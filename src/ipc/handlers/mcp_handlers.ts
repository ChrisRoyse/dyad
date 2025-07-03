import { ipcMain } from "electron";
import { db } from "../../db";
import { mcp_servers, mcp_server_tools, mcp_server_resources } from "../../db/schema";
import { mcpServerManager, type MCPServerConfig } from "../../main/mcp/mcp-server-manager";
import { eq } from "drizzle-orm";
import log from "electron-log";

// List all MCP servers
ipcMain.handle("mcp:list-servers", async () => {
  try {
    const servers = await db.select().from(mcp_servers);
    return servers.map(server => ({
      ...server,
      status: mcpServerManager.getConnectionStatus(server.id) || "disconnected",
    }));
  } catch (error) {
    log.error("Error listing MCP servers:", error);
    throw error;
  }
});

// Get a single MCP server with its tools and resources
ipcMain.handle("mcp:get-server", async (_, serverId: number) => {
  try {
    const server = await db.select().from(mcp_servers).where(eq(mcp_servers.id, serverId)).get();
    if (!server) {
      throw new Error("Server not found");
    }

    const tools = await db.select().from(mcp_server_tools).where(eq(mcp_server_tools.serverId, serverId));
    const resources = await db.select().from(mcp_server_resources).where(eq(mcp_server_resources.serverId, serverId));

    return {
      ...server,
      status: mcpServerManager.getConnectionStatus(server.id) || "disconnected",
      tools,
      resources,
    };
  } catch (error) {
    log.error("Error getting MCP server:", error);
    throw error;
  }
});

// Create a new MCP server
ipcMain.handle("mcp:create-server", async (_, serverConfig: Omit<MCPServerConfig, "id">) => {
  try {
    const result = await db.insert(mcp_servers).values({
      name: serverConfig.name,
      description: serverConfig.description,
      transport_type: serverConfig.transport_type,
      command: serverConfig.command,
      args: serverConfig.args ? JSON.stringify(serverConfig.args) : null,
      url: serverConfig.url,
      env_vars: serverConfig.env_vars ? JSON.stringify(serverConfig.env_vars) : null,
      enabled: serverConfig.enabled,
    }).returning();

    const newServer = result[0];
    
    // Automatically connect if enabled
    if (newServer.enabled) {
      await mcpServerManager.connectServer({
        ...newServer,
        args: newServer.args ? JSON.parse(newServer.args) : undefined,
        env_vars: newServer.env_vars ? JSON.parse(newServer.env_vars) : undefined,
      } as MCPServerConfig);
    }

    return newServer;
  } catch (error) {
    log.error("Error creating MCP server:", error);
    throw error;
  }
});

// Update an existing MCP server
ipcMain.handle("mcp:update-server", async (_, serverId: number, updates: Partial<MCPServerConfig>) => {
  try {
    const result = await db.update(mcp_servers)
      .set({
        name: updates.name,
        description: updates.description,
        transport_type: updates.transport_type,
        command: updates.command,
        args: updates.args ? JSON.stringify(updates.args) : undefined,
        url: updates.url,
        env_vars: updates.env_vars ? JSON.stringify(updates.env_vars) : undefined,
        enabled: updates.enabled,
        updatedAt: new Date(),
      })
      .where(eq(mcp_servers.id, serverId))
      .returning();

    const updatedServer = result[0];
    
    // Reconnect if the server is enabled
    if (updatedServer.enabled) {
      await mcpServerManager.connectServer({
        ...updatedServer,
        args: updatedServer.args ? JSON.parse(updatedServer.args) : undefined,
        env_vars: updatedServer.env_vars ? JSON.parse(updatedServer.env_vars) : undefined,
      } as MCPServerConfig);
    } else {
      await mcpServerManager.disconnectServer(serverId);
    }

    return updatedServer;
  } catch (error) {
    log.error("Error updating MCP server:", error);
    throw error;
  }
});

// Delete an MCP server
ipcMain.handle("mcp:delete-server", async (_, serverId: number) => {
  try {
    await mcpServerManager.disconnectServer(serverId);
    await db.delete(mcp_servers).where(eq(mcp_servers.id, serverId));
    return { success: true };
  } catch (error) {
    log.error("Error deleting MCP server:", error);
    throw error;
  }
});

// Connect to a server
ipcMain.handle("mcp:connect-server", async (_, serverId: number) => {
  try {
    const server = await db.select().from(mcp_servers).where(eq(mcp_servers.id, serverId)).get();
    if (!server) {
      throw new Error("Server not found");
    }

    await mcpServerManager.connectServer({
      ...server,
      args: server.args ? JSON.parse(server.args) : undefined,
      env_vars: server.env_vars ? JSON.parse(server.env_vars) : undefined,
    } as MCPServerConfig);

    // Sync tools and resources after connection
    await syncServerCapabilities(serverId);

    return { success: true };
  } catch (error) {
    log.error("Error connecting to MCP server:", error);
    throw error;
  }
});

// Disconnect from a server
ipcMain.handle("mcp:disconnect-server", async (_, serverId: number) => {
  try {
    await mcpServerManager.disconnectServer(serverId);
    return { success: true };
  } catch (error) {
    log.error("Error disconnecting from MCP server:", error);
    throw error;
  }
});

// Sync server capabilities (tools and resources)
async function syncServerCapabilities(serverId: number) {
  try {
    // Get tools from the connected server
    const tools = await mcpServerManager.listTools(serverId);
    
    // Clear existing tools and insert new ones
    await db.delete(mcp_server_tools).where(eq(mcp_server_tools.serverId, serverId));
    
    if (tools.length > 0) {
      await db.insert(mcp_server_tools).values(
        tools.map(tool => ({
          serverId,
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema ? JSON.stringify(tool.inputSchema) : null,
          lastSyncedAt: new Date(),
        }))
      );
    }

    // Get resources from the connected server
    const resources = await mcpServerManager.listResources(serverId);
    
    // Clear existing resources and insert new ones
    await db.delete(mcp_server_resources).where(eq(mcp_server_resources.serverId, serverId));
    
    if (resources.length > 0) {
      await db.insert(mcp_server_resources).values(
        resources.map(resource => ({
          serverId,
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
          lastSyncedAt: new Date(),
        }))
      );
    }

    log.info(`Synced ${tools.length} tools and ${resources.length} resources for server ${serverId}`);
  } catch (error) {
    log.error(`Error syncing capabilities for server ${serverId}:`, error);
    throw error;
  }
}

// Execute a tool on a server
ipcMain.handle("mcp:execute-tool", async (_, serverId: number, toolName: string, args: any) => {
  try {
    const result = await mcpServerManager.executeTool(serverId, toolName, args);
    return result;
  } catch (error) {
    log.error("Error executing MCP tool:", error);
    throw error;
  }
});

// Read a resource from a server
ipcMain.handle("mcp:read-resource", async (_, serverId: number, uri: string) => {
  try {
    const result = await mcpServerManager.readResource(serverId, uri);
    return result;
  } catch (error) {
    log.error("Error reading MCP resource:", error);
    throw error;
  }
});

// Initialize MCP servers on startup
export async function initializeMCPServers() {
  try {
    const enabledServers = await db.select().from(mcp_servers).where(eq(mcp_servers.enabled, true));
    
    for (const server of enabledServers) {
      try {
        await mcpServerManager.connectServer({
          ...server,
          args: server.args ? JSON.parse(server.args) : undefined,
          env_vars: server.env_vars ? JSON.parse(server.env_vars) : undefined,
        } as MCPServerConfig);
        
        await syncServerCapabilities(server.id);
      } catch (error) {
        log.error(`Failed to connect to MCP server ${server.name} on startup:`, error);
      }
    }
  } catch (error) {
    log.error("Error initializing MCP servers:", error);
  }
}

// Set up event listeners for status changes
mcpServerManager.on("server-status-changed", (serverId: number, status: string, error?: string) => {
  // Broadcast status change to all renderer processes
  const windows = require("electron").BrowserWindow.getAllWindows();
  windows.forEach(window => {
    window.webContents.send("mcp:server-status-changed", { serverId, status, error });
  });
});

// Clean up on app quit
export function cleanupMCPServers() {
  return mcpServerManager.disconnectAll();
}