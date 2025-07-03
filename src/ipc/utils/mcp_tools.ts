import { tool } from "ai";
import { z } from "zod";
import { mcpServerManager } from "../../main/mcp/mcp-server-manager";
import { db } from "../../db";
import { mcp_servers, mcp_server_tools } from "../../db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";

export async function getMCPTools() {
  try {
    // Get all connected MCP servers
    const connectedServers = await db
      .select()
      .from(mcp_servers)
      .where(eq(mcp_servers.enabled, true));

    const tools: Record<string, any> = {};

    for (const server of connectedServers) {
      // Check if server is actually connected
      const status = mcpServerManager.getConnectionStatus(server.id);
      if (status !== "connected") {
        continue;
      }

      try {
        // Get tools from the connected server
        const serverTools = await mcpServerManager.listTools(server.id);
        
        // Get cached tool schemas from database for better performance
        const cachedTools = await db
          .select()
          .from(mcp_server_tools)
          .where(eq(mcp_server_tools.serverId, server.id));

        for (const serverTool of serverTools) {
          // Find cached schema for this tool
          const cachedTool = cachedTools.find(ct => ct.name === serverTool.name);
          
          let inputSchema;
          try {
            // Use cached schema if available, otherwise parse from server
            inputSchema = cachedTool?.inputSchema ? 
              JSON.parse(cachedTool.inputSchema) : 
              serverTool.inputSchema;
          } catch (error) {
            log.error(`Error parsing input schema for tool ${serverTool.name}:`, error);
            // Fallback to basic schema if parsing fails
            inputSchema = {
              type: "object",
              properties: {},
              additionalProperties: true
            };
          }

          // Convert JSON schema to Zod schema
          const zodSchema = jsonSchemaToZod(inputSchema);
          
          // Create a unique tool name combining server name and tool name
          const toolName = `${server.name.toLowerCase().replace(/\s+/g, '_')}_${serverTool.name}`;
          
          tools[toolName] = tool({
            description: `[${server.name}] ${serverTool.description || serverTool.name}`,
            parameters: zodSchema,
            execute: async (args) => {
              try {
                log.info(`Executing MCP tool ${serverTool.name} on server ${server.name} with args:`, args);
                
                const result = await mcpServerManager.executeTool(
                  server.id,
                  serverTool.name,
                  args
                );
                
                // Return formatted result
                return {
                  success: true,
                  result: result.content || result,
                  server: server.name,
                  tool: serverTool.name,
                };
              } catch (error) {
                log.error(`Error executing MCP tool ${serverTool.name}:`, error);
                return {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                  server: server.name,
                  tool: serverTool.name,
                };
              }
            },
          });
        }
      } catch (error) {
        log.error(`Error getting tools from MCP server ${server.name}:`, error);
      }
    }

    log.info(`Created ${Object.keys(tools).length} MCP tools from ${connectedServers.length} servers`);
    return tools;
  } catch (error) {
    log.error("Error creating MCP tools:", error);
    return {};
  }
}

// Helper function to convert JSON Schema to Zod schema
function jsonSchemaToZod(schema: any): z.ZodSchema {
  if (!schema || typeof schema !== "object") {
    return z.any();
  }

  switch (schema.type) {
    case "string":
      let stringSchema = z.string();
      if (schema.description) {
        stringSchema = stringSchema.describe(schema.description);
      }
      if (schema.enum && Array.isArray(schema.enum)) {
        return z.enum(schema.enum as [string, ...string[]]);
      }
      return stringSchema;

    case "number":
      let numberSchema = z.number();
      if (schema.description) {
        numberSchema = numberSchema.describe(schema.description);
      }
      return numberSchema;

    case "integer":
      let intSchema = z.number().int();
      if (schema.description) {
        intSchema = intSchema.describe(schema.description);
      }
      return intSchema;

    case "boolean":
      let boolSchema = z.boolean();
      if (schema.description) {
        boolSchema = boolSchema.describe(schema.description);
      }
      return boolSchema;

    case "array":
      let arraySchema = z.array(schema.items ? jsonSchemaToZod(schema.items) : z.any());
      if (schema.description) {
        arraySchema = arraySchema.describe(schema.description);
      }
      return arraySchema;

    case "object":
      if (schema.properties) {
        const shape: Record<string, z.ZodSchema> = {};
        const required = new Set(schema.required || []);

        for (const [key, value] of Object.entries(schema.properties)) {
          let propSchema = jsonSchemaToZod(value);
          if (!required.has(key)) {
            propSchema = propSchema.optional();
          }
          shape[key] = propSchema;
        }

        let objectSchema = z.object(shape);
        if (schema.description) {
          objectSchema = objectSchema.describe(schema.description);
        }
        return objectSchema;
      }
      return z.record(z.any());

    default:
      return z.any();
  }
}

// Create a tool for reading MCP resources
export function createMCPResourceTool() {
  return tool({
    description: "Read content from MCP server resources (files, documents, etc.)",
    parameters: z.object({
      server_name: z.string().describe("Name of the MCP server"),
      uri: z.string().describe("URI of the resource to read"),
    }),
    execute: async ({ server_name, uri }) => {
      try {
        // Find the server by name
        const server = await db
          .select()
          .from(mcp_servers)
          .where(eq(mcp_servers.name, server_name))
          .get();

        if (!server) {
          return {
            success: false,
            error: `MCP server '${server_name}' not found`,
          };
        }

        // Check if server is connected
        const status = mcpServerManager.getConnectionStatus(server.id);
        if (status !== "connected") {
          return {
            success: false,
            error: `MCP server '${server_name}' is not connected`,
          };
        }

        const result = await mcpServerManager.readResource(server.id, uri);
        
        return {
          success: true,
          content: result.contents,
          server: server_name,
          uri,
        };
      } catch (error) {
        log.error(`Error reading MCP resource ${uri} from ${server_name}:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          server: server_name,
          uri,
        };
      }
    },
  });
}