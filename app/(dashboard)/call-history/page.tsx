'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from "@/components/dashboard-header";
import { CallHistoryList } from "@/components/call-history-list";
import { CallHistoryStats } from "@/components/call-history-stats";
import { CallHistoryConversation, ConversationsResponse } from "@/lib/elevenlabs/api";
import { Input } from "@/components/ui/input"; // Will be removed for date inputs
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

// Define a simplified agent type for the frontend, matching /api/agents response
// Ideally, this would be a shared type
interface AppAgent {
  agent_id: string; // This is the elevenlabs_agent_id
  name: string;
  // Add other fields if needed by the UI, e.g., app_mapping_id
}

export default function CallHistoryPage() {
  const [agentsList, setAgentsList] = useState<AppAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState<boolean>(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);
  const [criteriaList, setCriteriaList] = useState<string[]>([]);
  const [selectedCriteriaIds, setSelectedCriteriaIds] = useState<string[]>([]);

  const [conversations, setConversations] = useState<CallHistoryConversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  
  const [filterAfterDate, setFilterAfterDate] = useState<Date | undefined>(undefined);
  const [filterBeforeDate, setFilterBeforeDate] = useState<Date | undefined>(undefined);

  // Removed parseTimestamp as we'll convert from Date objects

  // Fetch agents for the dropdown
  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoadingAgents(true);
      try {
        const response = await fetch('/api/agents');
        if (!response.ok) {
          throw new Error('Failed to fetch agents');
        }
        const data: AppAgent[] = await response.json();
        setAgentsList(data);
      } catch (error) {
        console.error("Error fetching agents:", error);
        // Handle error appropriately, e.g., show a toast message
      } finally {
        setIsLoadingAgents(false);
      }
    };
    fetchAgents();
  }, []);

  const fetchCriteria = async (agentId: string) => {
    try {
      const response = await fetch(`/api/evaluation-criteria?agentId=${agentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch criteria');
      }
      const data = await response.json();
      setCriteriaList(data);
    } catch (error) {
      console.error("Error fetching criteria:", error);
      setCriteriaList([]);
    }
  };

  // Fetch conversations
  const fetchConversations = useCallback(async (loadMore = false) => {
    setIsLoadingConversations(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page_size', '20'); // Changed 'pageSize' to 'page_size'

      if (selectedAgentId && selectedAgentId !== "all") {
        queryParams.append('agentId', selectedAgentId);
      }
     if (selectedCriteriaIds.length > 0) {
       selectedCriteriaIds.forEach(id => queryParams.append('criteriaId', id));
     }
      
      if (filterBeforeDate) {
        queryParams.append('callStartBeforeUnix', Math.floor(filterBeforeDate.getTime() / 1000).toString());
      }
      if (filterAfterDate) {
        queryParams.append('callStartAfterUnix', Math.floor(filterAfterDate.getTime() / 1000).toString());
      }

      if (loadMore && nextCursor) {
        queryParams.append('cursor', nextCursor);
      }

      const response = await fetch(`/api/call-history?${queryParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch call history and parse error response" }));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      const data: ConversationsResponse = await response.json();
      
      setConversations(prev => loadMore ? [...prev, ...data.conversations] : data.conversations);
      setNextCursor(data.next_cursor);

    } catch (error) {
      console.error("Error fetching conversations:", error);
      // Handle error, e.g., show a toast
    } finally {
      setIsLoadingConversations(false);
    }
  }, [nextCursor, selectedAgentId, filterBeforeDate, filterAfterDate, selectedCriteriaIds]);

  // Initial fetch and fetch on filter change
  useEffect(() => {
    // Reset conversations and cursor when filters change, then fetch
    setConversations([]);
    setNextCursor(null);
    // Debounce or delay fetching if desired, for now direct fetch
    fetchConversations(false); 
  }, [selectedAgentId, filterBeforeDate, filterAfterDate, selectedCriteriaIds]); // Exclude fetchConversations from deps

  const handleLoadMore = () => {
    if (nextCursor && !isLoadingConversations) {
      fetchConversations(true);
    }
  };
  
  const handleApplyFilters = () => {
    // This function will trigger the useEffect for fetching conversations
    // by virtue of selectedAgentId, filterBeforeDate, filterAfterDate being in its dependency array.
    // If we wanted an explicit button, we'd call fetchConversations(false) here.
    // For now, useEffect handles it.
    // To make an explicit button work without auto-fetch on every input change,
    // we would need separate state for "applied filters" vs "input field values".
    // For simplicity, current setup auto-refreshes on filter input change.
    // If an explicit "Apply" button is desired, the useEffect dependency array for fetching
    // would need to change, or fetchConversations would be called directly from here.
    // The current useEffect for fetching will re-fetch when filter states change.
    // If we want a manual "Apply Filters" button, we'd remove the auto-fetch useEffect
    // and call fetchConversations(false) here.
    // For now, let's assume auto-refresh on filter change is acceptable.
    // If not, this function would call fetchConversations(false) and the useEffect would be different.
    console.log("Filters applied (or rather, state changed which triggers useEffect)");
  };


  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <DashboardHeader title="Lesson History" description="View your conversation history and transcriptions" />

      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
        <div>
          <Label htmlFor="agent-filter" className='block mb-2'>Lesson</Label>
          <Select
            value={selectedAgentId || "all"}
            onValueChange={(value) => {
              const newAgentId = value === "all" ? undefined : value;
              setSelectedAgentId(newAgentId);
              setSelectedCriteriaIds([]); // Reset criteria when agent changes
              if (newAgentId) {
                fetchCriteria(newAgentId);
              } else {
                setCriteriaList([]);
              }
            }}
            disabled={isLoadingAgents}
          >
            <SelectTrigger id="agent-filter" className="w-full">
              <SelectValue placeholder="Select Lesson" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lessons</SelectItem>
              {agentsList.map(agent => (
                <SelectItem key={agent.agent_id} value={agent.agent_id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedAgentId && criteriaList.length > 0 && (
          <div>
            <Label htmlFor="criteria-filter" className='block mb-2'>Criteria</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  <div className="flex gap-1 flex-wrap">
                    {selectedCriteriaIds.length > 0 ? (
                      selectedCriteriaIds.map((criteria) => (
                        <Badge
                          variant="secondary"
                          key={criteria}
                          className="mr-1"
                        >
                          {criteria}
                        </Badge>
                      ))
                    ) : (
                      "Select Criteria"
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search criteria..." />
                  <CommandEmpty>No criteria found.</CommandEmpty>
                  <CommandGroup>
                    {criteriaList.map((criteria) => (
                      <CommandItem
                        key={criteria}
                        value={criteria}
                        onSelect={(currentValue) => {
                          setSelectedCriteriaIds(
                            selectedCriteriaIds.includes(currentValue)
                              ? selectedCriteriaIds.filter((c) => c !== currentValue)
                              : [...selectedCriteriaIds, currentValue]
                          );
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCriteriaIds.includes(criteria) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {criteria}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}
        <div>
          <Label htmlFor="filter-after-date" className='block mb-2'>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="filter-after-date"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filterAfterDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterAfterDate ? format(filterAfterDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filterAfterDate}
                onSelect={setFilterAfterDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="filter-before-date" className='block mb-2'>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="filter-before-date"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filterBeforeDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterBeforeDate ? format(filterBeforeDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filterBeforeDate}
                onSelect={setFilterBeforeDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        {/* 
          An explicit "Apply Filters" button could be added here.
          If so, the useEffect that auto-fetches on filter state change would need adjustment.
          <Button onClick={handleApplyFilters} className="self-end">Apply Filters</Button> 
        */}
      </div>

      <CallHistoryList 
        conversations={conversations}
        isLoading={isLoadingConversations}
        hasMore={!!nextCursor}
        loadMore={handleLoadMore}
      />
    </div>
  );
}
