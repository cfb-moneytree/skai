"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { date: "Jan 1", characters: 1200, audioMinutes: 15 },
  { date: "Jan 2", characters: 1800, audioMinutes: 22 },
  { date: "Jan 3", characters: 2400, audioMinutes: 30 },
  { date: "Jan 4", characters: 1600, audioMinutes: 20 },
  { date: "Jan 5", characters: 3200, audioMinutes: 40 },
  { date: "Jan 6", characters: 2800, audioMinutes: 35 },
  { date: "Jan 7", characters: 4100, audioMinutes: 52 },
  { date: "Jan 8", characters: 3600, audioMinutes: 45 },
  { date: "Jan 9", characters: 2900, audioMinutes: 37 },
  { date: "Jan 10", characters: 3800, audioMinutes: 48 },
  { date: "Jan 11", characters: 4500, audioMinutes: 57 },
  { date: "Jan 12", characters: 3200, audioMinutes: 40 },
  { date: "Jan 13", characters: 2700, audioMinutes: 34 },
  { date: "Jan 14", characters: 4200, audioMinutes: 53 },
]

export function UsageChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Analytics</CardTitle>
        <CardDescription>Your voice generation usage over the past 14 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            characters: {
              label: "Characters",
              color: "hsl(var(--chart-1))",
            },
            audioMinutes: {
              label: "Audio Minutes",
              color: "hsl(var(--chart-2))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCharacters" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAudio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} tickMargin={10} className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="characters"
                stroke="hsl(var(--chart-1))"
                fillOpacity={1}
                fill="url(#colorCharacters)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="audioMinutes"
                stroke="hsl(var(--chart-2))"
                fillOpacity={1}
                fill="url(#colorAudio)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
