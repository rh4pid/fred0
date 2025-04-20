import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { EmailServiceTester } from "@/components/email-service-tester"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminPage() {
  const session = await getServerSession()

  if (!session?.user?.completedAuth || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage system settings and configurations</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Test and verify system components</CardDescription>
            </CardHeader>
            <CardContent>
              <EmailServiceTester />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

