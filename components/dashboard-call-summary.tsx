'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  total_message_count: number;
  total_call_duration_secs: number;
}

type TimeRange = "7days" | "30days" | "90days";

// Helper to format seconds into HH:MM:SS or MM:SS
const formatDuration = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return "00:00";
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const paddedHours = String(hours).padStart(2, '0');
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${paddedMinutes}:${paddedSeconds}`;
};

export function DashboardCallSummary() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<TimeRange>("7days");

  const fetchDashboardStats = useCallback(async (range: TimeRange) => {
    setIsLoading(true);
    setError(null);
    setStats(null); // Clear previous stats

    const now = new Date();
    let callStartAfterUnix: number;
    const callStartBeforeUnix = Math.floor(now.getTime() / 1000); // Current time

    switch (range) {
      case "7days":
        callStartAfterUnix = Math.floor(new Date(now.setDate(now.getDate() - 7)).getTime() / 1000);
        break;
      case "30days":
        callStartAfterUnix = Math.floor(new Date(now.setDate(now.getDate() - 30)).getTime() / 1000);
        break;
      case "90days":
        callStartAfterUnix = Math.floor(new Date(now.setDate(now.getDate() - 90)).getTime() / 1000);
        break;
      default:
        // Should not happen with TypeScript, but good for safety
        callStartAfterUnix = Math.floor(new Date(now.setDate(now.getDate() - 7)).getTime() / 1000);
    }
    
    // Reset date object for subsequent calculations if any
    now.setDate(now.getDate() + (range === "7days" ? 7 : range === "30days" ? 30 : 90));


    try {
      const response = await fetch(`/api/dashboard-stats?callStartAfterUnix=${callStartAfterUnix}&callStartBeforeUnix=${callStartBeforeUnix}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch dashboard stats" }));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }
      const data: DashboardStats = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats(selectedRange);
  }, [selectedRange, fetchDashboardStats]);

  const handleRangeChange = (value: string) => {
    setSelectedRange(value as TimeRange);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">
          Call Summary
        </CardTitle>
        <Select value={selectedRange} onValueChange={handleRangeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="mt-4">
        {isLoading && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-6 w-1/4" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-1/5" />
            </div>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        {!isLoading && !error && stats && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Messages</p>
              <p className="text-xl font-semibold">{stats.total_message_count.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Call Duration</p>
              <p className="text-xl font-semibold">{formatDuration(stats.total_call_duration_secs)}</p>
            </div>
          </div>
        )}
        {!isLoading && !error && !stats && (
            <p className="text-sm text-muted-foreground">No data available for the selected period.</p>
        )}
      </CardContent>
    </Card>
  );
}