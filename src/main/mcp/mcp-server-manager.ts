import { Client, StdioClientTransport, HttpClientTransport, WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/index.js";
import { spawn, type ChildProcess } from "child_process";
import { EventEmitter } from "events";
import log from "electron-log";

export interface MCPServerConfig {
  id: number;
  name: string;
  transport_type: "stdio" | "http" | "websocket";
  command?: string;
  args?: string[];
  url?: string;
  env_vars?: Record<string, string>;
  enabled: boolean;
}

export interface MCPServerConnection {
  server: MCPServerConfig;
  client: Client;
  process?: ChildProcess;
  status: "connecting" | "connected" | "disconnected" | "error";
  error?: string;
}

export class MCPServerManager extends EventEmitter {
  private connections = new Map<number, MCPServerConnection>();

  async connectServer(config: MCPServerConfig): Promise<void> {
    if (!config.enabled) {
      log.info(`MCP Server ${config.name} is disabled, skipping connection`);
      return;
    }

    // Disconnect existing connection if any
    await this.disconnectServer(config.id);

    const connection: MCPServerConnection = {
      server: config,
      client: new Client({ name: `dyad-mcp-client-${config.id}`, version: "1.0.0" }, { capabilities: {} }),
      status: "connecting",
    };

    this.connections.set(config.id, connection);
    this.emit("server-status-changed", config.id, "connecting");

    try {
      let transport;

      switch (config.transport_type) {
        case "stdio": {
          if (!config.command) {
            throw new Error("Command is required for stdio transport");
          }

          const env = {
            ...process.env,
            ...config.env_vars,
          };

          const childProcess = spawn(config.command, config.args || [], {
            env,
            stdio: ["pipe", "pipe", "pipe"],
          });

          connection.process = childProcess;

          childProcess.on("error", (error) => {
            log.error(`MCP Server ${config.name} process error:`, error);
            this.handleConnectionError(config.id, error.message);
          });

          childProcess.on("exit", (code) => {
            log.info(`MCP Server ${config.name} process exited with code ${code}`);
            this.handleConnectionError(config.id, `Process exited with code ${code}`);
          });

          transport = new StdioClientTransport({
            command: config.command,
            args: config.args,
            env,
          });
          break;
        }

        case "http": {
          if (!config.url) {
            throw new Error("URL is required for HTTP transport");
          }
          transport = new HttpClientTransport(new URL(config.url));
          break;
        }

        case "websocket": {
          if (!config.url) {
            throw new Error("URL is required for WebSocket transport");
          }
          transport = new WebSocketClientTransport(new URL(config.url));
          break;
        }

        default:
          throw new Error(`Unsupported transport type: ${config.transport_type}`);
      }

      await connection.client.connect(transport);
      
      connection.status = "connected";
      this.emit("server-status-changed", config.id, "connected");
      log.info(`Successfully connected to MCP server: ${config.name}`);

      // Get initial capabilities
      const capabilities = await this.getServerCapabilities(config.id);
      this.emit("server-capabilities-updated", config.id, capabilities);

    } catch (error) {
      this.handleConnectionError(config.id, error instanceof Error ? error.message : String(error));
    }
  }

  async disconnectServer(serverId: number): Promise<void> {
    const connection = this.connections.get(serverId);
    if (!connection) return;

    try {
      await connection.client.close();
      
      if (connection.process) {
        connection.process.kill();
      }

      this.connections.delete(serverId);
      this.emit("server-status-changed", serverId, "disconnected");
      log.info(`Disconnected from MCP server: ${connection.server.name}`);
    } catch (error) {
      log.error(`Error disconnecting from MCP server ${connection.server.name}:`, error);
    }
  }

  private handleConnectionError(serverId: number, errorMessage: string): void {
    const connection = this.connections.get(serverId);
    if (!connection) return;

    connection.status = "error";
    connection.error = errorMessage;
    this.emit("server-status-changed", serverId, "error", errorMessage);
    log.error(`MCP Server ${connection.server.name} connection error:`, errorMessage);
  }

  async getServerCapabilities(serverId: number) {
    const connection = this.connections.get(serverId);
    if (!connection || connection.status !== "connected") {
      throw new Error("Server not connected");
    }

    const serverInfo = connection.client.getServerInfo();
    const capabilities = connection.client.getServerCapabilities();

    return {
      serverInfo,
      capabilities,
    };
  }

  async listTools(serverId: number) {
    const connection = this.connections.get(serverId);
    if (!connection || connection.status !== "connected") {
      throw new Error("Server not connected");
    }

    try {
      const response = await connection.client.listTools();
      return response.tools;
    } catch (error) {
      log.error(`Error listing tools for server ${connection.server.name}:`, error);
      throw error;
    }
  }

  async listResources(serverId: number) {
    const connection = this.connections.get(serverId);
    if (!connection || connection.status !== "connected") {
      throw new Error("Server not connected");
    }

    try {
      const response = await connection.client.listResources();
      return response.resources;
    } catch (error) {
      log.error(`Error listing resources for server ${connection.server.name}:`, error);
      throw error;
    }
  }

  async executeTool(serverId: number, toolName: string, args: any) {
    const connection = this.connections.get(serverId);
    if (!connection || connection.status !== "connected") {
      throw new Error("Server not connected");
    }

    try {
      const response = await connection.client.callTool({
        name: toolName,
        arguments: args,
      });
      return response;
    } catch (error) {
      log.error(`Error executing tool ${toolName} on server ${connection.server.name}:`, error);
      throw error;
    }
  }

  async readResource(serverId: number, uri: string) {
    const connection = this.connections.get(serverId);
    if (!connection || connection.status !== "connected") {
      throw new Error("Server not connected");
    }

    try {
      const response = await connection.client.readResource({
        uri,
      });
      return response;
    } catch (error) {
      log.error(`Error reading resource ${uri} from server ${connection.server.name}:`, error);
      throw error;
    }
  }

  getConnectionStatus(serverId: number): MCPServerConnection["status"] | null {
    const connection = this.connections.get(serverId);
    return connection?.status || null;
  }

  getConnectedServers(): MCPServerConfig[] {
    const connectedServers: MCPServerConfig[] = [];
    for (const connection of this.connections.values()) {
      if (connection.status === "connected") {
        connectedServers.push(connection.server);
      }
    }
    return connectedServers;
  }

  async disconnectAll(): Promise<void> {
    const serverIds = Array.from(this.connections.keys());
    await Promise.all(serverIds.map(id => this.disconnectServer(id)));
  }
}

// Singleton instance
export const mcpServerManager = new MCPServerManager();