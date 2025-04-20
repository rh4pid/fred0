"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

export function EmailServiceTester() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{
    type: "success" | "error" | null
    message: string | null
  }>({ type: null, message: null })

  async function testEmailService() {
    setLoading(true)
    setStatus({ type: null, message: null })

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to test email service")
      }

      setStatus({
        type: "success",
        message: "Email service is working correctly. Check your inbox for a test email.",
      })
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Email Service Status</h3>
          <p className="text-sm text-muted-foreground">Test the email service configuration by sending a test email</p>
        </div>
        <Button onClick={testEmailService} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Email Service"
          )}
        </Button>
      </div>

      {status.type && (
        <Alert variant={status.type === "success" ? "default" : "destructive"}>
          {status.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{status.type === "success" ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

