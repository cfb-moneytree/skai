"use client" // This page needs to be a client component to use hooks

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
// Avatar components are not used in the table view, can be removed if not needed elsewhere on this page
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Plus, Play, Settings, MoreHorizontal, BotIcon, Loader2, ArrowUpDown, Edit3, Trash2, BookOpen, ExternalLink } from "lucide-react" // Added Trash2, BookOpen, ExternalLink
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useRouter } from "next/navigation" // Added useRouter
import type { AppAgentDetails } from "@/app/api/agents/route";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// Removed Sheet and Conversation imports


type SortKey = "name" | "app_created_at";
type SortDirection = "asc" | "desc";

export default function AgentsPage() {
  const router = useRouter(); // Added router initialization
  const [agents, setAgents] = useState<AppAgentDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("app_created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [agentToDelete, setAgentToDelete] = useState<AppAgentDetails | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Stores ID of agent being deleted
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Removed isTestSheetOpen and selectedAgentForTest states


  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoading(true);
      setError(null);
      let url = "/api/agents";
      if (debouncedSearchTerm) {
        url += `?name=${encodeURIComponent(debouncedSearchTerm)}`;
      }

      try {
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch agents");
        }
        const data = await response.json();
        // Apply current sort to newly fetched/filtered data
        const sortedData = [...data].sort((a, b) => {
          if (sortKey === "name") {
            const nameA = a.name?.toLowerCase() || "";
            const nameB = b.name?.toLowerCase() || "";
            if (nameA < nameB) return sortDirection === "asc" ? -1 : 1;
            if (nameA > nameB) return sortDirection === "asc" ? 1 : -1;
            return 0;
          } else if (sortKey === "app_created_at") {
            const dateA = new Date(a.app_created_at).getTime();
            const dateB = new Date(b.app_created_at).getTime();
            return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
          }
          return 0;
        });
        setAgents(sortedData);
      } catch (err) {
        console.error("Error fetching agents:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, [debouncedSearchTerm, sortKey, sortDirection]); // Re-fetch when debouncedSearchTerm or sort changes

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = "asc";
    if (sortKey === key && sortDirection === "asc") {
      direction = "desc";
    }
    setSortKey(key);
    setSortDirection(direction);

    setAgents(prevAgents => {
      const sorted = [...prevAgents].sort((a, b) => {
        if (key === "name") {
          const nameA = a.name?.toLowerCase() || "";
          const nameB = b.name?.toLowerCase() || "";
          if (nameA < nameB) return direction === "asc" ? -1 : 1;
          if (nameA > nameB) return direction === "asc" ? 1 : -1;
          return 0;
        } else if (key === "app_created_at") {
          const dateA = new Date(a.app_created_at).getTime();
          const dateB = new Date(b.app_created_at).getTime();
          return direction === "asc" ? dateA - dateB : dateB - dateA;
        }
        return 0;
      });
      return sorted;
    });
  };

  const handleDeleteAgent = (agent: AppAgentDetails) => {
    setAgentToDelete(agent);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteAgent = async () => {
    if (!agentToDelete) return;

    const agentId = agentToDelete.agent_id;
    const agentDisplayName = agentToDelete.name || `Agent ID ${agentId}`;

    setIsDeleting(agentId);
    setDeleteError(null);
    setIsConfirmDeleteDialogOpen(false); // Close dialog

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let errorMsg = `Failed to delete agent ${agentDisplayName}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorData.details || errorMsg;
        } catch (e) { /* ignore if response not json */ }
        throw new Error(errorMsg);
      }

      // Remove agent from local state to update UI immediately
      setAgents(prevAgents => prevAgents.filter(a => a.agent_id !== agentId));
      toast.success(`Lesson "${agentDisplayName}" deleted successfully.`);
      console.log(`Lesson ${agentDisplayName} deleted successfully.`);

    } catch (err) {
      console.error(`Error deleting agent ${agentDisplayName}:`, err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while deleting.";
      toast.error(errorMessage);
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(null);
      setAgentToDelete(null); // Clear the agent to delete
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Removed handleOpenTestSheet function

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <DashboardHeader title="Lessons" description="Create and manage your lessons" />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Your Lessons</CardTitle>
              <CardDescription>Manage your lessons and their configurations</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search lessons by name..."
                  className="w-full md:w-[250px] pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button asChild>
                <Link href="/agents/create">
                  <Plus className="mr-2 h-4 w-4" /> Create Lesson
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-2">Loading lessons...</p>
            </div>
          )}
          {error && (
            <div className="text-center py-10 text-destructive">
              <p>Error loading lessons: {error}</p>
              {/* Optionally, add a retry button */}
            </div>
          )}
          {!isLoading && !error && agents.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <BotIcon className="h-12 w-12 mx-auto mb-2" />
              <p>No agents found.</p>
              <p>Get started by creating your first AI lesson.</p>
            </div>
          )}
          {!isLoading && !error && agents.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort("name")} className="cursor-pointer">
                    <div className="flex items-center">
                      Lesson Name
                      {sortKey === "name" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead>Lesson ID</TableHead> {/* New Column Header */}
                  <TableHead onClick={() => handleSort("app_created_at")} className="cursor-pointer">
                     <div className="flex items-center">
                      Created Date
                      {sortKey === "app_created_at" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.app_mapping_id || agent.agent_id}>
                    <TableCell className="font-medium">
                      <Link href={`/agents/create?id=${agent.agent_id}`} className="hover:underline">
                        {agent.name || "Unnamed Agent"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate" title={agent.agent_id}>
                      {agent.agent_id}
                    </TableCell> {/* New Cell for Agent ID */}
                    <TableCell>{formatDate(agent.app_created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/agents/create?id=${agent.agent_id}`)}
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            <span>Edit Lesson</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(`/talk/${agent.agent_id}`, '_blank')}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            <span>Test Lesson</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/agents/${agent.agent_id}/lessons`)}
                          >
                            <BookOpen className="mr-2 h-4 w-4" />
                            <span>Lesson</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/agents/${agent.agent_id}/assessment`)}
                          >
                            <BookOpen className="mr-2 h-4 w-4" />
                            <span>Assessment</span>
                          </DropdownMenuItem>
                          {/* Test Agent Lesson DropdownMenuItem REMOVED */}
                          <DropdownMenuItem
                            onClick={() => handleDeleteAgent(agent)}
                            disabled={isDeleting === agent.agent_id}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            {isDeleting === agent.agent_id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            <span>Delete Lesson</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {deleteError && <p className="text-sm text-destructive mt-4 text-center">Error deleting lesson: {deleteError}</p>}
        </CardContent>
      </Card>

      {/* Removed Sheet component rendering */}

      {agentToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the lesson
                "{agentToDelete.name || `Lesson ID ${agentToDelete.agent_id}`}" and remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAgentToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteAgent}
                disabled={isDeleting === agentToDelete.agent_id}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting === agentToDelete.agent_id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete Lesson
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

