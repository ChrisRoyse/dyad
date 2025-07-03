import { useEffect } from "react";
import { useAtom } from "jotai";
import { mcpServerStatusAtom, mcpServersAtom } from "../atoms/mcp";

export function useMCPServerStatus() {
  const [serverStatus, setServerStatus] = useAtom(mcpServerStatusAtom);
  const [, refreshServers] = useAtom(mcpServersAtom);

  useEffect(() => {
    const handleStatusChange = (
      event: any,
      { serverId, status, error }: { serverId: number; status: string; error?: string }
    ) => {
      setServerStatus(prev => ({
        ...prev,
        [serverId]: { status, error },
      }));
      
      // Refresh the servers list to update the UI
      refreshServers();
    };

    // Listen for MCP server status changes
    window.electron.ipcRenderer.on("mcp:server-status-changed", handleStatusChange);

    // Cleanup on unmount
    return () => {
      window.electron.ipcRenderer.off("mcp:server-status-changed", handleStatusChange);
    };
  }, [setServerStatus, refreshServers]);

  return serverStatus;
}