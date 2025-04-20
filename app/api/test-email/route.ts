import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { testEmailService } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    // Only allow admins to test the email service
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await testEmailService()

    if (!result.success) {
      return NextResponse.json({ error: result.message, details: result.error }, { status: 500 })
    }

    return NextResponse.json({ message: result.message })
  } catch (error) {
    console.error("Error testing email service:", error)
    return NextResponse.json({ error: "Failed to test email service" }, { status: 500 })
  }
}

