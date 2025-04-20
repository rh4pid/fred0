import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { PrismaClient } from "@prisma/client"
import { generateTOTP } from "@/lib/totp"
import { hash } from "bcrypt"

const prisma = new PrismaClient()

// Setup MFA for a user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { securityQuestions } = await request.json()

    // Generate TOTP secret
    const { secret, qrCode } = generateTOTP({
      email: session.user.email || "user@example.com",
    })

    // Check if MFA settings already exist
    const existingMFA = await prisma.mFASettings.findUnique({
      where: { userId: session.user.id },
    })

    // Create or update MFA settings
    if (existingMFA) {
      await prisma.mFASettings.update({
        where: { userId: session.user.id },
        data: {
          totpSecret: secret,
          totpEnabled: true,
        },
      })
    } else {
      await prisma.mFASettings.create({
        data: {
          userId: session.user.id,
          totpSecret: secret,
          totpEnabled: true,
          backupCodes: [],
        },
      })
    }

    // Process security questions
    if (securityQuestions && Array.isArray(securityQuestions)) {
      // Delete existing security questions
      await prisma.securityQuestion.deleteMany({
        where: { userId: session.user.id },
      })

      // Add new security questions
      for (const sq of securityQuestions) {
        if (sq.question && sq.answer) {
          // Hash the answer for security
          const hashedAnswer = await hash(sq.answer.toLowerCase(), 10)

          await prisma.securityQuestion.create({
            data: {
              userId: session.user.id,
              question: sq.question,
              answer: hashedAnswer,
              isActive: sq.isActive || false,
            },
          })
        }
      }
    }

    // Generate QR code
    const qrCodeDataUrl = await qrCode()

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataUrl,
    })
  } catch (error) {
    console.error("Error setting up MFA:", error)
    return NextResponse.json({ error: "Failed to set up MFA" }, { status: 500 })
  }
}

// Get MFA status
export async function GET() {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get MFA settings
    const mfaSettings = await prisma.mFASettings.findUnique({
      where: { userId: session.user.id },
    })

    // Get security questions (without answers)
    const securityQuestions = await prisma.securityQuestion.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        question: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      mfaEnabled: !!mfaSettings?.totpEnabled,
      securityQuestions,
    })
  } catch (error) {
    console.error("Error getting MFA status:", error)
    return NextResponse.json({ error: "Failed to get MFA status" }, { status: 500 })
  }
}

