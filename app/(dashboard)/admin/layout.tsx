"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  let activeTab = "users"
  if (pathname === "/admin/agents") {
    activeTab = "agents"
  // } else if (pathname === "/admin/call-history") {
  //   activeTab = "calls"
  } else if (pathname === "/admin/settings") {
    activeTab = "settings"
  // } else if (pathname === "/admin/logs") {
  //   activeTab = "logs"
  } else if (pathname === "/admin") {
    activeTab = "users" // The first tab, which now shows API settings
  }

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader title="Admin Panel" description="Manage your application and users" />
      <div className="p-4 space-y-4">
        <Tabs value={activeTab} className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-5 md:inline-flex">
            <TabsTrigger value="users" asChild>
              <a href="/admin">Users</a>
            </TabsTrigger>
            <TabsTrigger value="agents" asChild>
              <a href="/admin/agents">Agents</a>
            </TabsTrigger>
            {/* <TabsTrigger value="calls" asChild>
              <a href="/admin/call-history">Calls</a>
            </TabsTrigger> */}
            <TabsTrigger value="settings" asChild>
              <a href="/admin/settings">Settings</a>
            </TabsTrigger>
            {/* <TabsTrigger value="logs" asChild>
              <a href="/admin/logs">Logs</a>
            </TabsTrigger> */}
          </TabsList>
          <Separator className="my-4" />
          {children}
        </Tabs>
      </div>
    </div>
  )
}
