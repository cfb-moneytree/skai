"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Phone, Clock, DollarSign, Users, TrendingUp, TrendingDown } from "lucide-react"

// Sample data for detailed analytics
const hourlyCallData = [
  { hour: "00:00", calls: 12, avgDuration: 3.2, cost: 1.92 },
  { hour: "01:00", calls: 8, avgDuration: 2.8, cost: 1.12 },
  { hour: "02:00", calls: 5, avgDuration: 2.1, cost: 0.53 },
  { hour: "03:00", calls: 3, avgDuration: 1.9, cost: 0.29 },
  { hour: "04:00", calls: 2, avgDuration: 2.3, cost: 0.23 },
  { hour: "05:00", calls: 4, avgDuration: 2.7, cost: 0.54 },
  { hour: "06:00", calls: 15, avgDuration: 3.1, cost: 2.33 },
  { hour: "07:00", calls: 28, avgDuration: 3.8, cost: 5.32 },
  { hour: "08:00", calls: 45, avgDuration: 4.2, cost: 9.45 },
  { hour: "09:00", calls: 62, avgDuration: 4.5, cost: 13.95 },
  { hour: "10:00", calls: 58, avgDuration: 4.1, cost: 11.89 },
  { hour: "11:00", calls: 52, avgDuration: 3.9, cost: 10.14 },
  { hour: "12:00", calls: 48, avgDuration: 3.7, cost: 8.88 },
  { hour: "13:00", calls: 55, avgDuration: 4.0, cost: 11.0 },
  { hour: "14:00", calls: 61, avgDuration: 4.3, cost: 13.12 },
  { hour: "15:00", calls: 59, avgDuration: 4.1, cost: 12.08 },
  { hour: "16:00", calls: 53, avgDuration: 3.8, cost: 10.07 },
  { hour: "17:00", calls: 47, avgDuration: 3.6, cost: 8.46 },
  { hour: "18:00", calls: 35, avgDuration: 3.2, cost: 5.6 },
  { hour: "19:00", calls: 28, avgDuration: 2.9, cost: 4.06 },
  { hour: "20:00", calls: 22, avgDuration: 2.7, cost: 2.97 },
  { hour: "21:00", calls: 18, avgDuration: 2.5, cost: 2.25 },
  { hour: "22:00", calls: 15, avgDuration: 2.3, cost: 1.73 },
  { hour: "23:00", calls: 10, avgDuration: 2.1, cost: 1.05 },
]

const agentUsageData = [
  { name: "Customer Support Bot", calls: 342, percentage: 35, color: "#3b82f6" },
  { name: "Sales Assistant", calls: 289, percentage: 29, color: "#10b981" },
  { name: "Technical Expert", calls: 156, percentage: 16, color: "#f59e0b" },
  { name: "Marketing Advisor", calls: 123, percentage: 13, color: "#ef4444" },
  { name: "HR Assistant", calls: 68, percentage: 7, color: "#8b5cf6" },
]

export function DetailedCallAnalytics() {
  const [timeRange, setTimeRange] = useState("24h")
  const [metric, setMetric] = useState("calls")

  const totalCalls = hourlyCallData.reduce((sum, hour) => sum + hour.calls, 0)
  const totalCost = hourlyCallData.reduce((sum, hour) => sum + hour.cost, 0)
  const avgDuration = hourlyCallData.reduce((sum, hour) => sum + hour.avgDuration, 0) / hourlyCallData.length

  const peakHour = hourlyCallData.reduce((max, hour) => (hour.calls > max.calls ? hour : max), hourlyCallData[0])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls (24h)</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +12% from yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDuration.toFixed(1)}m</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              -3% from yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +8% from yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{peakHour.hour}</div>
            <div className="text-xs text-muted-foreground">{peakHour.calls} calls</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hourly Call Distribution */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Hourly Call Distribution</CardTitle>
                  <CardDescription>Call volume and metrics throughout the day</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={metric} onValueChange={setMetric}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calls">Call Volume</SelectItem>
                      <SelectItem value="avgDuration">Avg Duration</SelectItem>
                      <SelectItem value="cost">Cost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  calls: { label: "Calls", color: "hsl(var(--chart-1))" },
                  avgDuration: { label: "Avg Duration", color: "hsl(var(--chart-2))" },
                  cost: { label: "Cost", color: "hsl(var(--chart-3))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyCallData}>
                    <XAxis dataKey="hour" tickLine={false} axisLine={false} className="text-xs" interval={2} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      className="text-xs"
                      tickFormatter={(value) => {
                        if (metric === "cost") return `$${value}`
                        if (metric === "avgDuration") return `${value}m`
                        return value.toString()
                      }}
                    />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null

                        const data = payload[0].payload
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3">
                            <p className="font-medium mb-2">{label}</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between gap-4">
                                <span>Calls:</span>
                                <span className="font-medium">{data.calls}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Avg Duration:</span>
                                <span className="font-medium">{data.avgDuration}m</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Cost:</span>
                                <span className="font-medium">${data.cost}</span>
                              </div>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey={metric} className={`fill-[--color-${metric}]`} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Agent Usage Distribution */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Agent Usage</CardTitle>
              <CardDescription>Distribution of calls by agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentUsageData.map((agent, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{agent.name}</span>
                      <Badge variant="outline">{agent.percentage}%</Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${agent.percentage}%`,
                          backgroundColor: agent.color,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{agent.calls} calls</span>
                      <span>{agent.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
