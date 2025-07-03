import React from "react";
import { useAtom } from "jotai";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Plug, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { mcpServersAtom } from "../atoms/mcp";
import { useMCPServerStatus } from "../hooks/useMCPServerStatus";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useRouter } from "@tanstack/react-router";

export function MCPToolIndicatorCompact() {
  const [servers] = useAtom(mcpServersAtom);
  const { navigate } = useRouter();
  useMCPServerStatus(); // Listen for status updates

  const connectedServers = servers.filter(server => server.status === "connected");
  const disconnectedServers = servers.filter(server => server.status === "disconnected" && server.enabled);
  const errorServers = servers.filter(server => server.status === "error");

  if (servers.length === 0) {
    return null;
  }

  const handleClick = () => {
    navigate({ to: "/mcp-servers" });
  };

  const getIndicatorColor = () => {
    if (errorServers.length > 0) return "text-red-500";
    if (disconnectedServers.length > 0) return "text-yellow-500";
    if (connectedServers.length > 0) return "text-green-500";
    return "text-gray-500";
  };

  const getTooltipContent = () => {
    const parts = [];
    
    if (connectedServers.length > 0) {
      parts.push(`${connectedServers.length} connected: ${connectedServers.map(s => s.name).join(", ")}`);
    }
    
    if (disconnectedServers.length > 0) {
      parts.push(`${disconnectedServers.length} disconnected: ${disconnectedServers.map(s => s.name).join(", ")}`);
    }
    
    if (errorServers.length > 0) {
      parts.push(`${errorServers.length} errors: ${errorServers.map(s => s.name).join(", ")}`);
    }
    
    return parts.join("\n");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleClick}
            variant="ghost"
            size="sm"
            className="hidden @6xs:flex cursor-pointer items-center gap-1 text-sm px-2 py-1 rounded-md"
          >
            <Plug size={16} className={getIndicatorColor()} />
            <span className="text-xs">
              {connectedServers.length}/{servers.length}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="text-sm">
            <div className="font-medium mb-1">MCP Servers</div>
            {getTooltipContent() || "No MCP servers configured"}
            <div className="text-xs text-muted-foreground mt-1">
              Click to manage servers
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}