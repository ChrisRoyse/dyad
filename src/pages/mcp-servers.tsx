import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { Plus, Power, PowerOff, Settings, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";
import { toast } from "sonner";
import { MCPServerDialog } from "../components/MCPServerDialog";
import { mcpServersAtom, mcpServerActions, type MCPServer } from "../atoms/mcp";
import { useMCPServerStatus } from "../hooks/useMCPServerStatus";

export default function MCPServersPage() {
  const [servers, refreshServers] = useAtom(mcpServersAtom);
  const [loading, setLoading] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Use the status hook to listen for real-time updates
  useMCPServerStatus();

  const handleCreateServer = async (serverData: Omit<MCPServer, "id" | "status" | "createdAt" | "updatedAt">) => {
    try {
      setLoading(true);
      await mcpServerActions.createServer(serverData);
      await refreshServers();
      toast.success("MCP server created successfully");
    } catch (error) {
      toast.error("Failed to create MCP server: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateServer = async (serverData: Omit<MCPServer, "id" | "status" | "createdAt" | "updatedAt">) => {
    if (!editingServer) return;
    
    try {
      setLoading(true);
      await mcpServerActions.updateServer(editingServer.id, serverData);
      await refreshServers();
      setEditingServer(null);
      toast.success("MCP server updated successfully");
    } catch (error) {
      toast.error("Failed to update MCP server: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteServer = async (serverId: number) => {
    try {
      setLoading(true);
      await mcpServerActions.deleteServer(serverId);
      await refreshServers();
      toast.success("MCP server deleted successfully");
    } catch (error) {
      toast.error("Failed to delete MCP server: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConnection = async (server: MCPServer) => {
    try {
      setLoading(true);
      if (server.status === "connected") {
        await mcpServerActions.disconnectServer(server.id);
        toast.success(`Disconnected from ${server.name}`);
      } else {
        await mcpServerActions.connectServer(server.id);
        toast.success(`Connecting to ${server.name}...`);
      }
      await refreshServers();
    } catch (error) {
      toast.error("Failed to toggle connection: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Error";
      default:
        return "Disconnected";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MCP Servers</h1>
          <p className="text-muted-foreground mt-1">
            Manage Model Context Protocol servers to extend AI capabilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refreshServers()} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        </div>
      </div>

      {servers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="text-muted-foreground">
                No MCP servers configured yet.
              </div>
              <div className="text-sm text-muted-foreground max-w-md">
                MCP servers provide additional tools and resources that AI models can use to interact with external systems like databases, APIs, and local files.
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Server
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => (
            <Card key={server.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(server.status)}`} />
                    <CardTitle className="text-lg">{server.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingServer(server);
                        setDialogOpen(true);
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete MCP Server</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{server.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteServer(server.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardDescription>{server.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{server.transport_type}</Badge>
                  <Badge variant={server.enabled ? "default" : "secondary"}>
                    {server.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {server.transport_type === "stdio" && server.command && (
                    <div className="font-mono bg-muted p-2 rounded text-xs">
                      {server.command} {server.args?.join(" ")}
                    </div>
                  )}
                  {(server.transport_type === "http" || server.transport_type === "websocket") && server.url && (
                    <div className="font-mono bg-muted p-2 rounded text-xs">
                      {server.url}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Status: </span>
                    <span className={`font-medium ${
                      server.status === "connected" ? "text-green-600" :
                      server.status === "error" ? "text-red-600" :
                      server.status === "connecting" ? "text-yellow-600" : 
                      "text-gray-600"
                    }`}>
                      {getStatusText(server.status)}
                    </span>
                  </div>
                  
                  {server.enabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleConnection(server)}
                      disabled={loading || server.status === "connecting"}
                    >
                      {server.status === "connected" ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>

                {server.status === "error" && server.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {server.error}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MCPServerDialog
        server={editingServer}
        onSave={editingServer ? handleUpdateServer : handleCreateServer}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingServer(null);
          }
        }}
      />
    </div>
  );
}