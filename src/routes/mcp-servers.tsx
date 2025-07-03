import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import MCPServersPage from "../pages/mcp-servers";

export const mcpServersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mcp-servers",
  component: MCPServersPage,
});