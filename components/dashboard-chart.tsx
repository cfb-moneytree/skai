"use client"

import { useState, useEffect, useCallback } from "react" // Added useEffect and useCallback
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Legend } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Phone, Clock, TrendingUp, MessageSquare } from "lucide-react" // Added MessageSquare, removed DollarSign

// Interface for individual conversation from API (subset of CallHistoryConversation)
interface ApiConversation {
  conversation_id: string;
  start_time_unix_secs: number;
  call_duration_secs: number;
  // Add other fields if needed for chart processing, e.g. agent_id
}

interface ConversationsApiResponse {
  conversations: ApiConversation[];
  has_more: boolean;
  next_cursor: string | null;
}

// Interface for the data points our chart will use
interface DailyCallStat {
  date: string; // YYYY-MM-DD for internal keying
  displayDate: string; // Formatted for XAxis (e.g., "Mon, DD")
  callUsage: number;
  avgDuration: number; // in minutes
}


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

// Sample call data generation is removed. Data will be fetched from API.

// Time period filters
const timePeriods = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
]

// Metric configurations
const metrics = {
  callUsage: {
    label: "Lesson Usage",
    color: "hsl(var(--chart-1))",
    icon: Phone,
    unit: "calls",
    description: "Number of lessons per day",
  },
  avgDuration: {
    label: "Avg Duration",
    color: "hsl(var(--chart-2))",
    icon: Clock,
    unit: "minutes",
    description: "Average lesson duration",
  },
  // totalCost: { // Removed as per request
  //   label: "Total Cost",
  //   color: "hsl(var(--chart-3))",
  //   icon: DollarSign,
  //   unit: "$",
  //   description: "Daily call costs",
  // },
}

export function DashboardChart() {
  const [chartData, setChartData] = useState<DailyCallStat[]>([]); // Changed type
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["callUsage", "avgDuration"])
  const [timePeriod, setTimePeriod] = useState("30d") // "7d", "30d", "90d"
  const [isLoadingData, setIsLoadingData] = useState(true); // For API chart data
  const [isLoadingStats, setIsLoadingStats] = useState(true); // For summary stats
  const [summaryStats, setSummaryStats] = useState<{ totalMessages: number; totalDuration: number }>({ totalMessages: 0, totalDuration: 0 });
  const [statsError, setStatsError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);


  const getDateRange = (period: string): { startDate: Date, endDate: Date, days: number } => {
    const endDate = new Date();
    const startDate = new Date();
    let days = 7;

    if (period === "30d") days = 30;
    else if (period === "90d") days = 90;
    
    startDate.setDate(endDate.getDate() - (days -1)); // - (days-1) to include today as the last day of the range
    startDate.setHours(0, 0, 0, 0); // Start of the first day
    endDate.setHours(23, 59, 59, 999); // End of the last day (today)
    
    return { startDate, endDate, days };
  };

  // Fetch summary statistics from API
  const fetchSummaryStats = useCallback(async (period: string) => {
    setIsLoadingStats(true);
    setStatsError(null);
    const { startDate, endDate } = getDateRange(period);
    const callStartAfterUnix = Math.floor(startDate.getTime() / 1000);
    const callStartBeforeUnix = Math.floor(endDate.getTime() / 1000);

    try {
      const response = await fetch(`/api/dashboard-stats?callStartAfterUnix=${callStartAfterUnix}&callStartBeforeUnix=${callStartBeforeUnix}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch summary stats" }));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }
      const data = await response.json();
      setSummaryStats({ totalMessages: data.total_message_count, totalDuration: data.total_call_duration_secs });
    } catch (err) {
      console.error("Error fetching summary stats:", err);
      setStatsError(err instanceof Error ? err.message : "An unknown error occurred.");
      setSummaryStats({ totalMessages: 0, totalDuration: 0 });
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch and process chart data from API
  const fetchChartData = useCallback(async (period: string) => {
    setIsLoadingData(true);
    setChartError(null);
    setChartData([]); // Clear previous data

    const { startDate, endDate, days } = getDateRange(period);
    const callStartAfterUnix = Math.floor(startDate.getTime() / 1000);
    const callStartBeforeUnix = Math.floor(endDate.getTime() / 1000);

    let allConversations: ApiConversation[] = [];
    let nextCursor: string | null = null;
    let hasMore = true;
    const MAX_PAGES = 10; // Safety break for pagination
    let pagesFetched = 0;

    try {
      while (hasMore && pagesFetched < MAX_PAGES) {
        const queryParams = new URLSearchParams({
          page_size: '100', // Max page size for call history
          callStartAfterUnix: callStartAfterUnix.toString(),
          callStartBeforeUnix: callStartBeforeUnix.toString(),
        });
        if (nextCursor) {
          queryParams.append('cursor', nextCursor);
        }

        const response = await fetch(`/api/call-history?${queryParams.toString()}`);
        pagesFetched++;
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Failed to fetch call history for chart" }));
          throw new Error(errorData.message || `API Error: ${response.status}`);
        }
        const data: ConversationsApiResponse = await response.json();
        allConversations.push(...data.conversations);
        nextCursor = data.next_cursor;
        hasMore = data.has_more;
      }
      if (pagesFetched >= MAX_PAGES && hasMore) {
        console.warn("Reached max pages fetching chart data. Data might be incomplete.");
      }

      // Process conversations into daily stats
      const dailyDataMap = new Map<string, { callCount: number; totalDurationSecs: number }>();

      allConversations.forEach(convo => {
        const date = new Date(convo.start_time_unix_secs * 1000);
        const dateString = date.toISOString().split("T")[0]; // YYYY-MM-DD

        const dayEntry = dailyDataMap.get(dateString) || { callCount: 0, totalDurationSecs: 0 };
        dayEntry.callCount += 1;
        dayEntry.totalDurationSecs += convo.call_duration_secs || 0;
        dailyDataMap.set(dateString, dayEntry);
      });

      // Create a complete list of dates for the period
      const finalChartData: DailyCallStat[] = [];
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateString = currentDate.toISOString().split("T")[0];
        const displayDate = currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        
        const dayStat = dailyDataMap.get(dateString);
        if (dayStat) {
          finalChartData.push({
            date: dateString,
            displayDate,
            callUsage: dayStat.callCount,
            avgDuration: dayStat.callCount > 0 ? parseFloat(((dayStat.totalDurationSecs / dayStat.callCount) / 60).toFixed(2)) : 0,
          });
        } else {
          finalChartData.push({
            date: dateString,
            displayDate,
            callUsage: 0,
            avgDuration: 0,
          });
        }
      }
      setChartData(finalChartData);

    } catch (err) {
      console.error("Error fetching or processing chart data:", err);
      setChartError(err instanceof Error ? err.message : "An unknown error occurred.");
      setChartData([]); // Clear data on error
    } finally {
      setIsLoadingData(false);
    }
  }, []);


  useEffect(() => {
    fetchSummaryStats(timePeriod);
    fetchChartData(timePeriod);
  }, [timePeriod, fetchSummaryStats, fetchChartData]);

  // No longer need getFilteredData or filteredData as chartData is now directly from API for the period
  // const filteredData = chartData; // Use chartData directly

  // Calculate summary statistics (this is for the sample chart data, will be replaced for actual summary)
  // const calculateStats = () => {
  //   if (filteredData.length === 0) {
  //     return { totalCalls: 0, avgDuration: 0, totalCost: 0, avgSuccessRate: 0 };
  //   }
  //   const totalCalls = filteredData.reduce((sum, day) => sum + day.callUsage, 0)
  //   const avgDurationValue = filteredData.reduce((sum, day) => sum + day.avgDuration, 0) / filteredData.length
  //   const totalCostValue = filteredData.reduce((sum, day) => sum + day.totalCost, 0)
  //   const avgSuccessRateValue = filteredData.reduce((sum, day) => sum + day.successRate, 0) / filteredData.length

  //   return {
  //     totalCalls,
  //     avgDuration: Number.parseFloat(avgDurationValue.toFixed(2)),
  //     totalCost: Number.parseFloat(totalCostValue.toFixed(2)),
  //     avgSuccessRate: Number.parseFloat(avgSuccessRateValue.toFixed(1)),
  //   }
  // }

  // const stats = calculateStats(); // This will be replaced by summaryStats from API

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) => (prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]))
  }

  // Format Y-axis values based on metric
  const formatYAxisValue = (value: number, metric: string) => {
    // if (metric === "totalCost") return `$${value.toFixed(0)}` // totalCost removed
    if (metric === "avgDuration") return `${value.toFixed(1)}m`
    return value.toString()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Lesson Analytics Overview</CardTitle>
            <CardDescription>Track your lesson usage, duration, and costs over time</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timePeriods.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metric Selection */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(metrics).map(([key, metric]) => {
            const Icon = metric.icon
            const isSelected = selectedMetrics.includes(key)
            return (
              <Button
                key={key}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => toggleMetric(key)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {metric.label}
              </Button>
            )
          })}
        </div>

        {/* Summary Stats - Updated to use API data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {isLoadingStats ? (
            <>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="h-7 w-20 bg-gray-300 animate-pulse mx-auto rounded"></div>
                <div className="h-4 w-24 bg-gray-200 animate-pulse mx-auto mt-1 rounded"></div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="h-7 w-20 bg-gray-300 animate-pulse mx-auto rounded"></div>
                <div className="h-4 w-28 bg-gray-200 animate-pulse mx-auto mt-1 rounded"></div>
              </div>
            </>
          ) : statsError ? (
            <div className="col-span-1 sm:col-span-2 text-center p-3 bg-muted rounded-lg text-red-500">
              Error loading summary: {statsError}
            </div>
          ) : (
            <>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center text-2xl font-bold text-blue-600">
                  <MessageSquare className="h-6 w-6 mr-2" />
                  {summaryStats.totalMessages.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total Messages</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center text-2xl font-bold text-green-600">
                  <Clock className="h-6 w-6 mr-2" />
                  {formatDuration(summaryStats.totalDuration)}
                </div>
                <div className="text-xs text-muted-foreground">Total Lesson Duration</div>
              </div>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {isLoadingData && (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            <p>Loading chart data...</p>
          </div>
        )}
        {!isLoadingData && chartError && (
           <div className="flex items-center justify-center h-[350px] text-red-500">
            <p>Error loading chart: {chartError}</p>
          </div>
        )}
        {!isLoadingData && !chartError && selectedMetrics.length === 0 && (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select at least one metric to display the chart</p>
            </div>
          </div>
        )}
        {!isLoadingData && !chartError && selectedMetrics.length > 0 && chartData.length === 0 && (
           <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            <p>No call data available for the selected period.</p>
          </div>
        )}
        {!isLoadingData && !chartError && selectedMetrics.length > 0 && chartData.length > 0 && (
          <ChartContainer
            config={Object.fromEntries(
              selectedMetrics.map((metricKey) => {
                const metricConfig = metrics[metricKey as keyof typeof metrics];
                if (!metricConfig) return [metricKey, { label: metricKey, color: "hsl(var(--muted))" }]; // Fallback
                return [
                  metricKey,
                  {
                    label: metricConfig.label,
                    color: metricConfig.color,
                  },
                ];
              }),
            )}
            className="h-[350px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData} // Use chartData directly
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 0,
                }}
              >
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  className="text-xs text-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  className="text-xs text-muted-foreground"
                  tickFormatter={(value) => {
                    // Format based on the first selected metric
                    const primaryMetric = selectedMetrics[0]
                    return formatYAxisValue(value, primaryMetric)
                  }}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null

                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-3">
                        <p className="font-medium mb-2">{label}</p>
                        {payload.map((entry, index) => {
                          const metricKey = entry.dataKey as string;
                          const metricConfig = metrics[metricKey as keyof typeof metrics];
                          if (!metricConfig) return null; // Skip if metric config not found (e.g. totalCost was removed)
                          const Icon = metricConfig.icon;

                          return (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <Icon className="h-4 w-4" style={{ color: entry.color }} />
                              <span>{metricConfig.label}:</span>
                              <span className="font-medium">
                                {/* {metricKey === "totalCost" && "$"} // totalCost removed */}
                                {entry.value}
                                {metricKey === "avgDuration" && "m"}
                                {metricKey === "callUsage" && " lessons"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <Legend
                  content={({ payload }) => (
                    <div className="flex justify-center gap-4 mt-4">
                      {payload?.map((entry, index) => {
                        const metricKey = entry.dataKey as string;
                        const metricConfig = metrics[metricKey as keyof typeof metrics];
                         if (!metricConfig) return null;
                        const Icon = metricConfig.icon;

                        return (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Icon className="h-4 w-4" style={{ color: entry.color }} />
                            <span>{metricConfig.label}</span> {/* Changed from entry.value to metricConfig.label */}
                          </div>
                        );
                      })}
                    </div>
                  )}
                />

                {selectedMetrics.map((metricKey) => {
                  if (!metrics[metricKey as keyof typeof metrics]) return null; // Don't render line if metric was removed
                  return (
                  <Line
                    key={metricKey}
                    type="monotone"
                    dataKey={metricKey}
                    strokeWidth={2}
                    activeDot={{
                      r: 6,
                      className: "fill-primary",
                    }}
                    className={`stroke-[--color-${metricKey}]`}
                    connectNulls={false}
                  />
                ) // Removed semicolon
                })}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Chart Legend with Descriptions */}
        {selectedMetrics.length > 0 && (
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {selectedMetrics.map((metricKey) => {
              const metricConfig = metrics[metricKey as keyof typeof metrics];
              if (!metricConfig) return null; // Don't render legend item if metric was removed
              const Icon = metricConfig.icon;

              return (
                <div key={metricKey} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <Icon className="h-4 w-4" style={{ color: metricConfig.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{metricConfig.label}</div>
                    <div className="text-xs text-muted-foreground">{metricConfig.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
