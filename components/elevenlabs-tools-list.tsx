'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface ToolInfo {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export default function ElevenLabsToolsList() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [initialToolsState, setInitialToolsState] = useState<ToolInfo[]>([]);
  const [isToolConfirmDeleteDialogOpen, setIsToolConfirmDeleteDialogOpen] = useState(false);
  const [toolToDeleteDetails, setToolToDeleteDetails] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingTool, setIsDeletingTool] = useState<string | null>(null);


  const fetchTools = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setHasPendingChanges(false);
    try {
      const response = await fetch('/api/admin/agent-tools');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch tools (status: ${response.status})`);
      }
      const data: ToolInfo[] = await response.json();
      setTools(data);
      setInitialToolsState(JSON.parse(JSON.stringify(data))); // Deep copy for initial state
    } catch (err: any) {
      setError(err.message);
      setTools([]);
      setInitialToolsState([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const handleCheckboxChange = (toolId: string, checked: boolean) => {
    setTools(prevTools =>
      prevTools.map(t => (t.id === toolId ? { ...t, isActive: checked } : t))
    );
    setHasPendingChanges(true);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const payload = tools.map(tool => ({ toolId: tool.id, isActive: tool.isActive }));
      const response = await fetch('/api/admin/mcp-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload), // Send the entire list
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save tool statuses.');
      }
      toast.success('Tool statuses updated successfully!');
      setHasPendingChanges(false);
      setInitialToolsState(JSON.parse(JSON.stringify(tools))); // Update initial state after save
    } catch (err: any) {
      toast.error(`Error saving tool statuses: ${err.message}`);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    setTools(JSON.parse(JSON.stringify(initialToolsState))); // Revert to initial state
    setHasPendingChanges(false);
  };

  const handleDeleteTool = (toolId: string, toolName: string) => {
    setToolToDeleteDetails({ id: toolId, name: toolName });
    setIsToolConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteTool = async () => {
    if (!toolToDeleteDetails) return;

    const { id: toolId, name: toolName } = toolToDeleteDetails;

    setIsDeletingTool(toolId);
    setIsToolConfirmDeleteDialogOpen(false);

    try {
      const response = await fetch(`/api/admin/mcp-tools/${toolId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete tool (status: ${response.status})`);
      }
      toast.success(`Tool "${toolName}" deleted successfully.`);
      // Remove from local state to update UI
      setTools(prevTools => prevTools.filter(t => t.id !== toolId));
      setInitialToolsState(prevInitialTools => prevInitialTools.filter(t => t.id !== toolId));
      // Consider if hasPendingChanges needs update if a deleted tool affected it.
      // For now, assuming save/cancel handles overall pending state.
    } catch (err: any) {
      toast.error(`Error deleting tool "${toolName}": ${err.message}`);
      setError(err.message); // Optionally set a more prominent error display
    } finally {
      setIsDeletingTool(null);
      setToolToDeleteDetails(null);
    }
  };

  return (
    <React.Fragment>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Available ElevenLabs Tools</CardTitle>
          <CardDescription>
            List of tools available from the ElevenLabs API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-2">Loading tools...</p>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error Fetching Tools</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && tools.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px] text-center">Active</TableHead>
                  <TableHead className="w-[100px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell className="font-mono text-xs truncate max-w-[200px]" title={tool.id}>{tool.id}</TableCell>
                    <TableCell className="font-medium">{tool.name}</TableCell>
                    <TableCell>{tool.description}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={tool.isActive}
                        onCheckedChange={(checked) => handleCheckboxChange(tool.id, !!checked)}
                        aria-label={`Toggle active status for tool ${tool.name}`}
                        disabled={isLoading || isSaving}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTool(tool.id, tool.name)}
                        disabled={isLoading || isSaving || isDeletingTool === tool.id}
                        aria-label={`Delete tool ${tool.name}`}
                        className="text-destructive hover:text-destructive-foreground"
                      >
                        {isDeletingTool === tool.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && !error && tools.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No tools found or available.</p>
          )}
          {!isLoading && !error && tools.length > 0 && (
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={handleCancelChanges}
                disabled={!hasPendingChanges || isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={!hasPendingChanges || isSaving}
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {toolToDeleteDetails && (
        <AlertDialog open={isToolConfirmDeleteDialogOpen} onOpenChange={setIsToolConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the tool
                <strong> "{toolToDeleteDetails.name}" (ID: {toolToDeleteDetails.id})</strong>.
                This will remove it from ElevenLabs and your local database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setToolToDeleteDetails(null);
                setIsToolConfirmDeleteDialogOpen(false);
              }}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteTool}
                disabled={isDeletingTool === toolToDeleteDetails.id}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingTool === toolToDeleteDetails.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete Tool
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </React.Fragment>
  );
}