import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { SecuritySettings } from "@/components/security-settings"

export default async function SecurityPage() {
  const session = await getServerSession()

  if (!session?.user?.completedAuth) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground">Manage your authentication and security preferences</p>
        </div>
        <SecuritySettings />
      </main>
    </div>
  )
}

