import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Get a specific meeting
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const meetingId = params.id

    // Check if user has access to this meeting
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
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

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({ meeting })
  } catch (error) {
    console.error("Error fetching meeting:", error)
    return NextResponse.json({ error: "Failed to fetch meeting" }, { status: 500 })
  }
}

// Update a meeting
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const meetingId = params.id
    const { title, description, scheduledFor, participants } = await request.json()

    // Check if user is the creator of the meeting
    const existingMeeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        createdBy: session.user.id,
      },
    })

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found or not authorized to update" }, { status: 403 })
    }

    // Update the meeting
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        title,
        description,
        scheduledFor: new Date(scheduledFor),
        participants: {
          set: [], // Remove all current participants
          connect: participants.map((id: string) => ({ id })), // Add new participants
        },
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

    return NextResponse.json({ meeting: updatedMeeting })
  } catch (error) {
    console.error("Error updating meeting:", error)
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 })
  }
}

// Delete a meeting
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const meetingId = params.id

    // Check if user is the creator of the meeting
    const existingMeeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        createdBy: session.user.id,
      },
    })

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found or not authorized to delete" }, { status: 403 })
    }

    // Delete all access tokens for this meeting
    await prisma.meetingAccessToken.deleteMany({
      where: { meetingId },
    })

    // Delete the meeting
    await prisma.meeting.delete({
      where: { id: meetingId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting meeting:", error)
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 })
  }
}

