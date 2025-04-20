import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { PrismaClient } from "@prisma/client"
import { randomBytes } from "crypto"

const prisma = new PrismaClient()

// Create a new meeting
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, description, scheduledFor, participants } = await request.json()

    // Generate a secure meeting ID
    const meetingId = randomBytes(16).toString("hex")

    // Create the meeting
    const meeting = await prisma.meeting.create({
      data: {
        id: meetingId,
        title,
        description,
        scheduledFor: new Date(scheduledFor),
        createdBy: session.user.id,
        participants: {
          connect: participants.map((id: string) => ({ id })),
        },
      },
    })

    // Generate one-time access tokens for participants
    const accessTokens = await Promise.all(
      participants.map(async (participantId: string) => {
        const token = randomBytes(32).toString("hex")

        await prisma.meetingAccessToken.create({
          data: {
            token,
            meetingId: meeting.id,
            userId: participantId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        })

        return { participantId, token }
      }),
    )

    return NextResponse.json({ meeting, accessTokens })
  } catch (error) {
    console.error("Error creating meeting:", error)
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 })
  }
}

// Get all meetings for the authenticated user
export async function GET() {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const meetings = await prisma.meeting.findMany({
      where: {
        OR: [{ createdBy: session.user.id }, { participants: { some: { id: session.user.id } } }],
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ meetings })
  } catch (error) {
    console.error("Error fetching meetings:", error)
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 })
  }
}

