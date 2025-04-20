import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { AuthenticationForm } from "@/components/authentication-form"

export default async function LoginPage() {
  const session = await getServerSession()

  // If user is already authenticated and completed all steps, redirect to dashboard
  if (session?.user?.completedAuth) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="mx-auto max-w-md w-full p-6 bg-background rounded-lg shadow-lg">
        <div className="space-y-2 text-center mb-8">
          <h1 className="text-3xl font-bold">SecureMeet</h1>
          <p className="text-muted-foreground">Secure access to classified meetings</p>
        </div>
        <AuthenticationForm />
      </div>
    </div>
  )
}

