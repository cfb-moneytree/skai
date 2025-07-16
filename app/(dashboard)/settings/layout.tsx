"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import { DashboardHeader } from "@/components/dashboard-header"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useAuthGuard()
  const pathname = usePathname()

  let activeTab = "profile"
  if (pathname === "/settings/security") {
    activeTab = "security"
  } else if (pathname === "/settings/organization") {
    activeTab = "organization"
  } else if (pathname === "/settings") {
    activeTab = "profile"
  }

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader title="Settings" description="Manage your account settings and preferences" />
      <div className="p-4 space-y-4">
        <Tabs value={activeTab} className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-3 md:inline-flex">
            <TabsTrigger value="profile" asChild>
              <a href="/settings">Profile</a>
            </TabsTrigger>
            <TabsTrigger value="security" asChild>
              <a href="/settings/security">Security</a>
            </TabsTrigger>
            <TabsTrigger value="organization" asChild>
              <a href="/settings/organization">Organization</a>
            </TabsTrigger>
          </TabsList>
          <Separator className="my-4" />
          {children}
        </Tabs>
      </div>
    </div>
  )
}