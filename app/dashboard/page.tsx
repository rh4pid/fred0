import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { MeetingsList } from "@/components/meetings-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await getServerSession()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Your Meetings</h1>
          <Link href="/dashboard/meetings/new">
            <Button>Create New Meeting</Button>
          </Link>
        </div>
        <MeetingsList />
      </main>
    </div>
  )
}

