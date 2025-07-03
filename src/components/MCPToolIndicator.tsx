import React from "react";
import { useAtom } from "jotai";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Plug, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { mcpServersAtom } from "../atoms/mcp";
import { useMCPServerStatus } from "../hooks/useMCPServerStatus";

export function MCPToolIndicator() {
  const [servers] = useAtom(mcpServersAtom);
  useMCPServerStatus(); // Listen for status updates

  const connectedServers = servers.filter(server => server.status === "connected");
  const disconnectedServers = servers.filter(server => server.status === "disconnected" && server.enabled);
  const errorServers = servers.filter(server => server.status === "error");

  if (servers.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Plug className="h-4 w-4" />
          <span className="text-sm font-medium">MCP Tools Status</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {connectedServers.map(server => (
            <Badge key={server.id} variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              {server.name}
            </Badge>
          ))}
          
          {disconnectedServers.map(server => (
            <Badge key={server.id} variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {server.name} (disconnected)
            </Badge>
          ))}
          
          {errorServers.map(server => (
            <Badge key={server.id} variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              {server.name} (error)
            </Badge>
          ))}
        </div>
        
        {connectedServers.length > 0 && (
          <div className="text-xs text-muted-foreground mt-2">
            {connectedServers.length} server{connectedServers.length !== 1 ? 's' : ''} connected with tools available to AI
          </div>
        )}
      </CardContent>
    </Card>
  );
}