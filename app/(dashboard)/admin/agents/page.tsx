"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // If you want to show agent status or similar
import { MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminAppAgentDetails } from '@/app/api/admin/agents/route'; // Import the type from the API route
import ElevenLabsToolsList from '@/components/elevenlabs-tools-list'; // Import the new component

interface FetchAdminAgentsResponse {
  agents: AdminAppAgentDetails[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export default function AdminAllAgentsPage() {
  const [agents, setAgents] = useState<AdminAppAgentDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalAgents, setTotalAgents] = useState(0);

  const fetchAdminAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/agents?page=${currentPage}&perPage=${itemsPerPage}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch admin agents (status: ${response.status})`);
      }
      const data: FetchAdminAgentsResponse = await response.json();
      setAgents(data.agents || []);
      setTotalAgents(data.total || 0);
      setTotalPages(data.totalPages || 0);
      setCurrentPage(data.page || 1); // Ensure current page is updated from response if backend adjusts it
    } catch (err: any) {
      setError(err.message);
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    fetchAdminAgents();
  }, [fetchAdminAgents]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Agents Management</CardTitle>
        <CardDescription>
          View and manage all ElevenLabs agents across all users. Total Agents: {totalAgents > 0 ? totalAgents : 'Loading...'}
        </CardDescription>
        {/* Add Search/Filter controls here if needed in the future */}
      </CardHeader>
      <CardContent>
        {isLoading && <p>Loading lessons...</p>}
        {error && <p className="text-red-600">Error: {error}</p>}
        {!isLoading && !error && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Created At</TableHead>
                  {/* <TableHead className="w-[80px]">Actions</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.app_mapping_id}> {/* Use app_mapping_id as it's unique in your table */}
                    <TableCell className="font-medium">{agent.name || 'Unnamed Agent'}</TableCell>
                    <TableCell className="truncate max-w-[150px]" title={agent.agent_id}>
                      {agent.agent_id}
                    </TableCell>
                    <TableCell>
                      {agent.user_name || agent.user_email || agent.user_id}
                    </TableCell>
                    <TableCell>{formatDate(agent.app_created_at)}</TableCell>
                    {/* <TableCell>
                      <DropdownMenu> */}
                        {/* <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger> */}
                        {/* <DropdownMenuContent align="end"> */}
                          {/* <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem disabled>View Details</DropdownMenuItem> */}
                          {/* Add other admin-specific actions here if needed */}
                          {/* <DropdownMenuSeparator /> */}
                          {/* <DropdownMenuItem className="text-destructive" disabled>Delete Agent Mapping</DropdownMenuItem> */}
                        {/* </DropdownMenuContent> */}
                      {/* </DropdownMenu>
                    </TableCell> */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end space-x-2 py-4">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages > 0 ? totalPages : 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}
        {(!isLoading && !error && agents.length === 0) && (
            <p className="text-center text-muted-foreground py-4">No agents found.</p>
        )}
      </CardContent>
      </Card>
      <ElevenLabsToolsList />
    </>
  );
}
