"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
})

const passwordSchema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
})

const verificationCodeSchema = z.object({
  verificationCode: z.string().length(6, { message: "Verification code must be 6 characters" }),
})

export function AuthenticationForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [authStep, setAuthStep] = useState(session?.user?.authStep ? Number.parseInt(session.user.authStep) + 1 : 1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState(session?.user?.email || "")

  // Email form (Step 1)
  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: email || "",
    },
  })

  // Password form (Step 2)
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
    },
  })

  // Verification Code form (Steps 3, 4, 5)
  const verificationCodeForm = useForm<z.infer<typeof verificationCodeSchema>>({
    resolver: zodResolver(verificationCodeSchema),
    defaultValues: {
      verificationCode: "",
    },
  })

  // Handle Step 1: Email submission
  async function onEmailSubmit(data: z.infer<typeof emailSchema>) {
    setLoading(true)
    setError(null)
    setEmail(data.email)

    try {
      const result = await signIn("credentials", {
        email: data.email,
        authStep: "1",
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email")
        return
      }

      setAuthStep(2)
    } catch (error) {
      setError("An unexpected error occurred")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Handle Step 2: Password submission
  async function onPasswordSubmit(data: z.infer<typeof passwordSchema>) {
    setLoading(true)
    setError(null)

    try {
      const result = await signIn("credentials", {
        email,
        password: data.password,
        authStep: "1",
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid password")
        return
      }

      setAuthStep(3)
    } catch (error) {
      setError("An unexpected error occurred")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Handle Steps 3, 4, 5: Verification Code submission
  async function onVerificationCodeSubmit(data: z.infer<typeof verificationCodeSchema>) {
    setLoading(true)
    setError(null)

    try {
      const result = await signIn("credentials", {
        email,
        verificationCode: data.verificationCode,
        authStep: authStep.toString(),
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid verification code")
        return
      }

      if (authStep < 5) {
        setAuthStep(authStep + 1)
        verificationCodeForm.reset()
      } else {
        // Authentication complete, redirect to dashboard
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      setError("An unexpected error occurred")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Email */}
      {authStep === 1 && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold">Step 1: Enter Your Email</h2>
            <p className="text-sm text-muted-foreground">We'll send a verification code to this email</p>
          </div>

          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </Form>
        </div>
      )}

      {/* Step 2: Password */}
      {authStep === 2 && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold">Step 2: Enter Your Password</h2>
            <p className="text-sm text-muted-foreground">Please enter your password to continue</p>
          </div>

          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </Form>
        </div>
      )}

      {/* Steps 3, 4, 5: Verification Codes */}
      {(authStep === 3 || authStep === 4 || authStep === 5) && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold">Step {authStep}: Enter Verification Code</h2>
            <p className="text-sm text-muted-foreground">Enter the verification code sent to your email</p>
          </div>

          <Form {...verificationCodeForm}>
            <form onSubmit={verificationCodeForm.handleSubmit(onVerificationCodeSubmit)} className="space-y-4">
              <FormField
                control={verificationCodeForm.control}
                name="verificationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter 6-digit code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : authStep === 5 ? (
                  "Complete Authentication"
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </Form>
        </div>
      )}
    </div>
  )
}

