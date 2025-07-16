"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Line, LineChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Download, ChevronDown } from "lucide-react"

// Sample usage data
const generateUsageData = () => {
  const data = []
  const today = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    // Generate realistic usage data with some trends
    const characters = Math.round(100 + Math.sin(i * 0.2) * 50 + Math.random() * 150)
    const audioMinutes = Math.round((characters / 100) * (0.8 + Math.random() * 0.4))
    const apiCalls = Math.round(characters / 50)

    data.push({
      date: date.toISOString().split("T")[0],
      displayDate: format(date, "MMM d"),
      characters,
      audioMinutes,
      apiCalls,
    })
  }

  return data
}

const usageData = generateUsageData()

// Sample agent usage data
const agentUsageData = [
  { name: "Customer Support Bot", usage: 1247, percentage: 42 },
  { name: "Sales Assistant", usage: 892, percentage: 30 },
  { name: "Technical Expert", usage: 456, percentage: 15 },
  { name: "Marketing Advisor", usage: 234, percentage: 8 },
  { name: "HR Assistant", usage: 145, percentage: 5 },
]

export function ProfileUsage() {
  const [dateRange, setDateRange] = useState<Date | undefined>(new Date())
  const [timeRange, setTimeRange] = useState("30d")
  const [usageTab, setUsageTab] = useState("characters")

  // Calculate totals
  const totalCharacters = usageData.reduce((sum, day) => sum + day.characters, 0)
  const totalAudioMinutes = usageData.reduce((sum, day) => sum + day.audioMinutes, 0)
  const totalApiCalls = usageData.reduce((sum, day) => sum + day.apiCalls, 0)

  return (
    <div className="space-y-6">
      {/* Usage Overview */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Usage Overview</CardTitle>
              <CardDescription>Track your usage across different metrics</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange ? format(dateRange, "MMMM yyyy") : "Pick a month"}
                    <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateRange} onSelect={setDateRange} initialFocus />
                </PopoverContent>
              </Popover>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Characters Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCharacters.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(totalCharacters / 30).toLocaleString()} avg. per day
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Audio Minutes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAudioMinutes.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(totalAudioMinutes / 30).toLocaleString()} avg. per day
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">API Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalApiCalls.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(totalApiCalls / 30).toLocaleString()} avg. per day
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Charts */}
          <Tabs value={usageTab} onValueChange={setUsageTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="characters">Characters</TabsTrigger>
              <TabsTrigger value="audio">Audio Minutes</TabsTrigger>
              <TabsTrigger value="api">API Calls</TabsTrigger>
            </TabsList>
            <TabsContent value="characters" className="pt-4">
              <ChartContainer
                config={{
                  characters: {
                    label: "Characters",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageData}>
                    <XAxis
                      dataKey="displayDate"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      className="text-xs"
                      interval="preserveStartEnd"
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} className="text-xs" />
                    <ChartTooltip />
                    <Line
                      type="monotone"
                      dataKey="characters"
                      strokeWidth={2}
                      activeDot={{
                        r: 6,
                        className: "fill-primary",
                      }}
                      className="stroke-[--color-characters]"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>
            <TabsContent value="audio" className="pt-4">
              <ChartContainer
                config={{
                  audioMinutes: {
                    label: "Audio Minutes",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageData}>
                    <XAxis
                      dataKey="displayDate"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      className="text-xs"
                      interval="preserveStartEnd"
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} className="text-xs" />
                    <ChartTooltip />
                    <Line
                      type="monotone"
                      dataKey="audioMinutes"
                      strokeWidth={2}
                      activeDot={{
                        r: 6,
                        className: "fill-primary",
                      }}
                      className="stroke-[--color-audioMinutes]"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>
            <TabsContent value="api" className="pt-4">
              <ChartContainer
                config={{
                  apiCalls: {
                    label: "API Calls",
                    color: "hsl(var(--chart-3))",
                  },
                }}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageData}>
                    <XAxis
                      dataKey="displayDate"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      className="text-xs"
                      interval="preserveStartEnd"
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} className="text-xs" />
                    <ChartTooltip />
                    <Line
                      type="monotone"
                      dataKey="apiCalls"
                      strokeWidth={2}
                      activeDot={{
                        r: 6,
                        className: "fill-primary",
                      }}
                      className="stroke-[--color-apiCalls]"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Agent Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Usage</CardTitle>
          <CardDescription>Usage distribution across your AI agents</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{
            characters: {
              // label: "Characters",
              color: "hsl(var(--chart-1))",
            },
          }} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentUsageData}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} tickMargin={10} className="text-xs" />
                <ChartTooltip />
                <Bar dataKey="usage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="mt-6 space-y-4">
            {agentUsageData.map((agent, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: index === 0 ? "hsl(var(--primary))" : `hsl(${220 + index * 30}, 70%, 60%)`,
                    }}
                  />
                  <span className="text-sm">{agent.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{agent.usage.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground w-12 text-right">{agent.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
