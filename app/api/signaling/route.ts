import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// WebRTC signaling endpoint
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { meetingId, signal, targetUserId } = await request.json()

    // Verify user has access to this meeting
    const hasAccess = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        OR: [{ createdBy: session.user.id }, { participants: { some: { id: session.user.id } } }],
      },
    })

    if (!hasAccess) {
      return NextResponse.json({ error: "Meeting not found or access denied" }, { status: 403 })
    }

    // Verify target user has access to this meeting
    const targetHasAccess = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        OR: [{ createdBy: targetUserId }, { participants: { some: { id: targetUserId } } }],
      },
    })

    if (!targetHasAccess) {
      return NextResponse.json({ error: "Target user does not have access to this meeting" }, { status: 403 })
    }

    // Store the signal in the database for the target user to retrieve
    await prisma.signalingMessage.create({
      data: {
        meetingId,
        fromUserId: session.user.id,
        toUserId: targetUserId,
        signal: JSON.stringify(signal),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in signaling:", error)
    return NextResponse.json({ error: "Signaling failed" }, { status: 500 })
  }
}

// Get signals intended for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const meetingId = url.searchParams.get("meetingId")

    if (!meetingId) {
      return NextResponse.json({ error: "Meeting ID is required" }, { status: 400 })
    }

    // Verify user has access to this meeting
    const hasAccess = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        OR: [{ createdBy: session.user.id }, { participants: { some: { id: session.user.id } } }],
      },
    })

    if (!hasAccess) {
      return NextResponse.json({ error: "Meeting not found or access denied" }, { status: 403 })
    }

    // Get signals intended for this user
    const signals = await prisma.signalingMessage.findMany({
      where: {
        meetingId,
        toUserId: session.user.id,
        expiresAt: { gt: new Date() },
      },
    })

    // Parse the signals
    const parsedSignals = signals.map((signal) => ({
      id: signal.id,
      fromUserId: signal.fromUserId,
      signal: JSON.parse(signal.signal),
    }))

    // Delete the retrieved signals
    if (signals.length > 0) {
      await prisma.signalingMessage.deleteMany({
        where: {
          id: { in: signals.map((s) => s.id) },
        },
      })
    }

    return NextResponse.json({ signals: parsedSignals })
  } catch (error) {
    console.error("Error retrieving signals:", error)
    return NextResponse.json({ error: "Failed to retrieve signals" }, { status: 500 })
  }
}

