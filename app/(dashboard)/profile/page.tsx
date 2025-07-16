"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileInfo } from "@/components/profile-info"
import { ProfileSecurity } from "@/components/profile-security"
import { ProfileSubscription } from "@/components/profile-subscription"
import { ProfileUsage } from "@/components/profile-usage"
import { ProfileApiKeys } from "@/components/profile-api-keys"

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("info")

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <DashboardHeader title="Profile" description="Manage your account settings and preferences" />

      <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2">
          <TabsTrigger value="info">Personal Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <ProfileInfo />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <ProfileSecurity />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <ProfileSubscription />
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <ProfileUsage />
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <ProfileApiKeys />
        </TabsContent>
      </Tabs>
    </div>
  )
}
