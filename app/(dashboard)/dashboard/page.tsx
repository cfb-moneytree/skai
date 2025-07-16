import { DashboardHeader } from "@/components/dashboard-header"
import { VoiceStats } from "@/components/voice-stats"
import { VoiceGenerator } from "@/components/voice-generator"
import { RecentGenerations } from "@/components/recent-generations"
import { DashboardChart } from "@/components/dashboard-chart"
import { VoiceModels } from "@/components/voice-models"
// import { DashboardCallSummary } from "@/components/dashboard-call-summary" // Removed

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <DashboardHeader title="Dashboard" description="Overview of your call analytics and voice activities." />

      {/* Call Summary Stats - This section is removed as it's integrated into DashboardChart */}
      {/*
      <div className="grid gap-6">
        <DashboardCallSummary />
      </div>
      */}

      {/* Stats Overview */}
      {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <VoiceStats />
      </div> */}

      {/* Call Analytics Chart - Full Width */}
      <div className="grid gap-6">
        <DashboardChart />
      </div>

      {/* Main Content Grid */}
      {/* <div className="grid gap-6 lg:grid-cols-3"> */}
        {/* Voice Generator - Takes 2 columns */}
        {/* <div className="lg:col-span-2">
          <VoiceGenerator />
        </div> */}

        {/* Voice Models - Takes 1 column */}
        {/* <div className="lg:col-span-1">
          <VoiceModels />
        </div> */}
      {/* </div> */}

      {/* Recent Generations */}
      {/* <div className="grid gap-6">
        <RecentGenerations />
      </div> */}
    </div>
  )
}
