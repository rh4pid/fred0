"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Check, Info, Loader2, Shield } from "lucide-react"

const securityQuestionOptions = [
  "What was the name of your first pet?",
  "In what city were you born?",
  "What is your mother's maiden name?",
  "What high school did you attend?",
  "What was the make of your first car?",
  "What is your favorite movie?",
  "What was your childhood nickname?",
  "What is the name of your favorite childhood teacher?",
]

const securityQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1, "Question is required"),
        answer: z.string().min(1, "Answer is required"),
        isActive: z.boolean().default(false),
      }),
    )
    .min(3, "At least 3 security questions are required"),
  activeQuestionIndex: z.number().min(0, "An active question must be selected"),
})

const totpVerificationSchema = z.object({
  verificationCode: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must contain only numbers"),
})

export function SecuritySettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [setupStep, setSetupStep] = useState(1)

  // Form for security questions
  const securityQuestionsForm = useForm<z.infer<typeof securityQuestionsSchema>>({
    resolver: zodResolver(securityQuestionsSchema),
    defaultValues: {
      questions: [
        { question: securityQuestionOptions[0], answer: "", isActive: true },
        { question: securityQuestionOptions[1], answer: "", isActive: false },
        { question: securityQuestionOptions[2], answer: "", isActive: false },
      ],
      activeQuestionIndex: 0,
    },
  })

  // Form for TOTP verification
  const totpVerificationForm = useForm<z.infer<typeof totpVerificationSchema>>({
    resolver: zodResolver(totpVerificationSchema),
    defaultValues: {
      verificationCode: "",
    },
  })

  // Fetch current security settings
  useEffect(() => {
    async function fetchSecuritySettings() {
      try {
        const response = await fetch("/api/auth/setup-mfa")
        const data = await response.json()

        if (data.mfaEnabled) {
          setMfaEnabled(true)
        }

        // If security questions exist, populate the form
        if (data.securityQuestions && data.securityQuestions.length > 0) {
          const formattedQuestions = data.securityQuestions.map((q: any) => ({
            question: q.question,
            answer: "", // Don't show the answer for security reasons
            isActive: q.isActive,
          }))

          // Find the active question index
          const activeIndex = formattedQuestions.findIndex((q: any) => q.isActive)

          securityQuestionsForm.reset({
            questions: formattedQuestions,
            activeQuestionIndex: activeIndex >= 0 ? activeIndex : 0,
          })
        }
      } catch (error) {
        console.error("Error fetching security settings:", error)
        setError("Failed to load security settings")
      } finally {
        setLoading(false)
      }
    }

    fetchSecuritySettings()
  }, [securityQuestionsForm])

  // Handle setting the active security question
  function setActiveQuestion(index: number) {
    const questions = securityQuestionsForm.getValues("questions")

    // Update isActive flags
    const updatedQuestions = questions.map((q, i) => ({
      ...q,
      isActive: i === index,
    }))

    securityQuestionsForm.setValue("questions", updatedQuestions)
    securityQuestionsForm.setValue("activeQuestionIndex", index)
  }

  // Handle security questions submission
  async function onSecurityQuestionsSubmit(data: z.infer<typeof securityQuestionsSchema>) {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Start MFA setup process
      const response = await fetch("/api/auth/setup-mfa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          securityQuestions: data.questions.map((q, i) => ({
            ...q,
            isActive: i === data.activeQuestionIndex,
          })),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to save security questions")
      }

      // If we got a QR code, show it for TOTP setup
      if (result.qrCode) {
        setQrCodeUrl(result.qrCode)
        setSetupStep(2)
      }

      setSuccess("Security questions saved successfully")
    } catch (error) {
      console.error("Error saving security questions:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  // Handle TOTP verification
  async function onTotpVerificationSubmit(data: z.infer<typeof totpVerificationSchema>) {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Verify the TOTP code
      const response = await fetch("/api/auth/verify-totp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: data.verificationCode,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to verify code")
      }

      setMfaEnabled(true)
      setSetupStep(3)
      setSuccess("Two-factor authentication enabled successfully")
    } catch (error) {
      console.error("Error verifying TOTP:", error)
      setError(error instanceof Error ? error.message : "Invalid verification code")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <Tabs defaultValue="mfa" className="space-y-4">
      <TabsList>
        <TabsTrigger value="mfa">Multi-Factor Authentication</TabsTrigger>
        <TabsTrigger value="security-questions">Security Questions</TabsTrigger>
        <TabsTrigger value="login-history">Login History</TabsTrigger>
      </TabsList>

      <TabsContent value="mfa" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              Add an extra layer of security to your account by enabling two-factor authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mfaEnabled ? (
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-500" />
                <span className="font-medium">Two-factor authentication is enabled</span>
              </div>
            ) : (
              <>
                {setupStep === 1 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Setup Required</AlertTitle>
                    <AlertDescription>
                      You need to set up security questions before enabling two-factor authentication. Please go to the
                      Security Questions tab to set them up.
                    </AlertDescription>
                  </Alert>
                )}

                {setupStep === 2 && qrCodeUrl && (
                  <div className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Scan QR Code</AlertTitle>
                      <AlertDescription>
                        Scan this QR code with your authenticator app (like Google Authenticator, Authy, or Microsoft
                        Authenticator).
                      </AlertDescription>
                    </Alert>

                    <div className="flex justify-center py-4">
                      <div className="border p-4 rounded-lg bg-white">
                        <Image src={qrCodeUrl || "/placeholder.svg"} alt="TOTP QR Code" width={200} height={200} />
                      </div>
                    </div>

                    <Form {...totpVerificationForm}>
                      <form
                        onSubmit={totpVerificationForm.handleSubmit(onTotpVerificationSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={totpVerificationForm.control}
                          name="verificationCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Verification Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter 6-digit code" {...field} />
                              </FormControl>
                              <FormDescription>Enter the 6-digit code from your authenticator app</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button type="submit" disabled={saving}>
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            "Verify and Enable"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>
                )}

                {setupStep === 3 && (
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertTitle>Setup Complete</AlertTitle>
                    <AlertDescription>
                      Two-factor authentication has been successfully enabled for your account.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
          {mfaEnabled && (
            <CardFooter>
              <Button variant="outline" className="w-full">
                Disable Two-Factor Authentication
              </Button>
            </CardFooter>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="security-questions">
        <Card>
          <CardHeader>
            <CardTitle>Security Questions</CardTitle>
            <CardDescription>
              Set up security questions that will be used as an additional verification step during login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4">
                <Check className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Form {...securityQuestionsForm}>
              <form onSubmit={securityQuestionsForm.handleSubmit(onSecurityQuestionsSubmit)} className="space-y-6">
                {securityQuestionsForm.getValues("questions").map((_, index) => (
                  <div key={index} className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Question {index + 1}</h3>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={index === securityQuestionsForm.getValues("activeQuestionIndex")}
                          onCheckedChange={() => setActiveQuestion(index)}
                          id={`active-${index}`}
                        />
                        <Label htmlFor={`active-${index}`}>
                          {index === securityQuestionsForm.getValues("activeQuestionIndex")
                            ? "Active Question"
                            : "Set as Active"}
                        </Label>
                      </div>
                    </div>

                    <FormField
                      control={securityQuestionsForm.control}
                      name={`questions.${index}.question`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Question</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a security question" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {securityQuestionOptions.map((question) => (
                                <SelectItem key={question} value={question}>
                                  {question}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={securityQuestionsForm.control}
                      name={`questions.${index}.answer`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Answer</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>Your answer is case-insensitive</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}

                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Security Questions"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="login-history">
        <Card>
          <CardHeader>
            <CardTitle>Login History</CardTitle>
            <CardDescription>Review recent login attempts to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-md border">
                <div className="grid grid-cols-4 p-4 font-medium border-b">
                  <div>Date & Time</div>
                  <div>IP Address</div>
                  <div>Device</div>
                  <div>Status</div>
                </div>
                <div className="divide-y">
                  <div className="grid grid-cols-4 p-4">
                    <div className="text-sm">Mar 10, 2025, 10:45 AM</div>
                    <div className="text-sm">192.168.1.1</div>
                    <div className="text-sm">Chrome on Windows</div>
                    <div className="text-sm text-green-600">Success</div>
                  </div>
                  <div className="grid grid-cols-4 p-4">
                    <div className="text-sm">Mar 9, 2025, 3:22 PM</div>
                    <div className="text-sm">192.168.1.1</div>
                    <div className="text-sm">Chrome on Windows</div>
                    <div className="text-sm text-green-600">Success</div>
                  </div>
                  <div className="grid grid-cols-4 p-4">
                    <div className="text-sm">Mar 8, 2025, 9:15 AM</div>
                    <div className="text-sm">203.0.113.42</div>
                    <div className="text-sm">Safari on macOS</div>
                    <div className="text-sm text-red-600">Failed (Wrong Password)</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

