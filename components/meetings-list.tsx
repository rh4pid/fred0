"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Users, Video } from "lucide-react"

type Meeting = {
  id: string
  title: string
  description: string | null
  scheduledFor: string
  participants: {
    id: string
    name: string
    email: string
  }[]
}

export function MeetingsList() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMeetings() {
      try {
        const response = await fetch("/api/meetings")
        const data = await response.json()

        if (data.meetings) {
          setMeetings(data.meetings)
        }
      } catch (error) {
        console.error("Error fetching meetings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMeetings()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-1/2 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No meetings scheduled</h2>
        <p className="text-muted-foreground mb-6">
          You don't have any upcoming meetings. Create a new meeting to get started.
        </p>
        <Link href="/dashboard/meetings/new">
          <Button>Create New Meeting</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {meetings.map((meeting) => (
        <Card key={meeting.id}>
          <CardHeader>
            <CardTitle>{meeting.title}</CardTitle>
            <CardDescription>{new Date(meeting.scheduledFor).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{meeting.description || "No description provided"}</p>
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="h-4 w-4 mr-1" />
              <span>{meeting.participants.length} participants</span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href={`/dashboard/meetings/${meeting.id}`}>
              <Button variant="outline">View Details</Button>
            </Link>
            <Link href={`/meeting-room/${meeting.id}`}>
              <Button>
                <Video className="h-4 w-4 mr-2" />
                Join
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

