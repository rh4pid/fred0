import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { PrismaClient } from "@prisma/client"
import { verifyTOTP } from "@/lib/totp"

const prisma = new PrismaClient()

// Verify TOTP code
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 })
    }

    // Get user's MFA settings
    const mfaSettings = await prisma.mFASettings.findUnique({
      where: { userId: session.user.id },
    })

    if (!mfaSettings || !mfaSettings.totpSecret) {
      return NextResponse.json({ error: "MFA not set up" }, { status: 400 })
    }

    // Verify the TOTP code
    const isValid = verifyTOTP({
      token: code,
      secret: mfaSettings.totpSecret,
    })

    if (!isValid) {
      // Log failed attempt
      await prisma.loginAttempt.create({
        data: {
          userId: session.user.id,
          success: false,
          failureReason: "Invalid TOTP code",
        },
      })

      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 })
    }

    // Enable TOTP if it's not already enabled
    if (!mfaSettings.totpEnabled) {
      await prisma.mFASettings.update({
        where: { userId: session.user.id },
        data: { totpEnabled: true },
      })
    }

    // Log successful verification
    await prisma.loginAttempt.create({
      data: {
        userId: session.user.id,
        success: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error verifying TOTP:", error)
    return NextResponse.json({ error: "Failed to verify code" }, { status: 500 })
  }
}

