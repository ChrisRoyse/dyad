import React, { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Plus, X } from "lucide-react";
import { mcpServerTemplates, type MCPServer } from "../atoms/mcp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface MCPServerDialogProps {
  server?: MCPServer;
  onSave: (server: Omit<MCPServer, "id" | "status" | "createdAt" | "updatedAt">) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MCPServerDialog({ 
  server, 
  onSave, 
  trigger,
  open,
  onOpenChange,
}: MCPServerDialogProps) {
  const [formData, setFormData] = useState(() => ({
    name: server?.name || "",
    description: server?.description || "",
    transport_type: server?.transport_type || "stdio" as const,
    command: server?.command || "",
    args: server?.args || [],
    url: server?.url || "",
    env_vars: server?.env_vars || {},
    enabled: server?.enabled !== false,
  }));

  const [newArg, setNewArg] = useState("");
  const [envVarKey, setEnvVarKey] = useState("");
  const [envVarValue, setEnvVarValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert("Server name is required");
      return;
    }

    if (formData.transport_type === "stdio" && !formData.command.trim()) {
      alert("Command is required for stdio transport");
      return;
    }

    if ((formData.transport_type === "http" || formData.transport_type === "websocket") && !formData.url.trim()) {
      alert("URL is required for HTTP/WebSocket transport");
      return;
    }

    onSave(formData);
    onOpenChange?.(false);
  };

  const addArg = () => {
    if (newArg.trim()) {
      setFormData(prev => ({ ...prev, args: [...prev.args, newArg.trim()] }));
      setNewArg("");
    }
  };

  const removeArg = (index: number) => {
    setFormData(prev => ({ ...prev, args: prev.args.filter((_, i) => i !== index) }));
  };

  const addEnvVar = () => {
    if (envVarKey.trim()) {
      setFormData(prev => ({
        ...prev,
        env_vars: { ...prev.env_vars, [envVarKey.trim()]: envVarValue }
      }));
      setEnvVarKey("");
      setEnvVarValue("");
    }
  };

  const removeEnvVar = (key: string) => {
    setFormData(prev => {
      const newEnvVars = { ...prev.env_vars };
      delete newEnvVars[key];
      return { ...prev, env_vars: newEnvVars };
    });
  };

  const useTemplate = (template: typeof mcpServerTemplates[0]) => {
    setFormData({
      name: template.name,
      description: template.description,
      transport_type: template.transport_type,
      command: template.command,
      args: template.args,
      url: "",
      env_vars: template.env_vars,
      enabled: template.enabled,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {server ? "Edit MCP Server" : "Add MCP Server"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Setup</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Choose from pre-configured MCP server templates:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mcpServerTemplates.map((template) => (
                <div
                  key={template.name}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer"
                  onClick={() => useTemplate(template)}
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {template.description}
                  </div>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {template.transport_type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Server Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My MCP Server"
                  />
                </div>
                <div>
                  <Label htmlFor="transport">Transport Type</Label>
                  <Select 
                    value={formData.transport_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, transport_type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stdio">STDIO</SelectItem>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="websocket">WebSocket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Server description..."
                  rows={2}
                />
              </div>

              {formData.transport_type === "stdio" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="command">Command</Label>
                    <Input
                      id="command"
                      value={formData.command}
                      onChange={(e) => setFormData(prev => ({ ...prev, command: e.target.value }))}
                      placeholder="npx @modelcontextprotocol/server-filesystem"
                    />
                  </div>

                  <div>
                    <Label>Arguments</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newArg}
                        onChange={(e) => setNewArg(e.target.value)}
                        placeholder="Add argument..."
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArg())}
                      />
                      <Button type="button" onClick={addArg} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.args.map((arg, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {arg}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => removeArg(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(formData.transport_type === "http" || formData.transport_type === "websocket") && (
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="http://localhost:8080 or ws://localhost:8080"
                  />
                </div>
              )}

              <div>
                <Label>Environment Variables</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={envVarKey}
                    onChange={(e) => setEnvVarKey(e.target.value)}
                    placeholder="Variable name..."
                    className="flex-1"
                  />
                  <Input
                    value={envVarValue}
                    onChange={(e) => setEnvVarValue(e.target.value)}
                    placeholder="Variable value..."
                    className="flex-1"
                  />
                  <Button type="button" onClick={addEnvVar} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {Object.entries(formData.env_vars).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <span className="font-mono text-sm">{key}=</span>
                      <span className="text-sm">{value || "(empty)"}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 ml-auto"
                        onClick={() => removeEnvVar(key)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                />
                <Label htmlFor="enabled">Enable server</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {server ? "Update Server" : "Create Server"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}