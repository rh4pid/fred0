import nodemailer from "nodemailer"

// Create reusable transporter object using environment variables
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Add debug logging in development
  ...(process.env.NODE_ENV === "development" && {
    debug: true,
    logger: true,
  }),
})

// Verify email configuration on startup
async function verifyEmailConfig() {
  try {
    await transporter.verify()
    console.log("Email service is ready to send emails")
    return true
  } catch (error) {
    console.error("Email service configuration error:", error)
    return false
  }
}

// Initialize email service
verifyEmailConfig()

interface SendVerificationEmailOptions {
  to: string
  code: string
  step: number
  retries?: number
}

export async function sendVerificationEmail({ to, code, step, retries = 3 }: SendVerificationEmailOptions) {
  const stepMessages = {
    1: {
      subject: "First Step Verification Code",
      title: "First Authentication Step",
      message: "To continue with your login, please use the following verification code:",
    },
    2: {
      subject: "Second Step Verification Code",
      title: "Second Authentication Step",
      message: "You're almost there! Use this verification code for the second step:",
    },
    3: {
      subject: "Final Step Verification Code",
      title: "Final Authentication Step",
      message: "Complete your secure login with this final verification code:",
    },
  }

  const { subject, title, message } = stepMessages[step as keyof typeof stepMessages]

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; text-align: center; padding: 20px 0;">${title}</h1>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
        <p style="margin-bottom: 20px;">${message}</p>
        <div style="background-color: #fff; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
          ${code}
        </div>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          This code will expire in 10 minutes for your security.
          If you didn't request this code, please ignore this email.
        </p>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
        Sent by SecureMeet - Secure Virtual Meeting Platform
      </div>
    </div>
  `

  const text = `
    ${title}
    
    ${message}
    
    Your verification code is: ${code}
    
    This code will expire in 10 minutes for your security.
    If you didn't request this code, please ignore this email.
  `

  try {
    const info = await transporter.sendMail({
      from: `"SecureMeet" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    })

    console.log("Verification email sent:", info.messageId)
    return true
  } catch (error) {
    console.error("Error sending verification email:", error)

    // Retry logic
    if (retries > 0) {
      console.log(`Retrying... ${retries} attempts remaining`)
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second before retrying
      return sendVerificationEmail({ to, code, step, retries: retries - 1 })
    }

    throw new Error("Failed to send verification email after multiple attempts")
  }
}

// Add a test function for verifying email configuration
export async function testEmailService() {
  try {
    const isConfigValid = await verifyEmailConfig()
    if (!isConfigValid) {
      throw new Error("Email configuration verification failed")
    }

    // Send a test email
    await sendVerificationEmail({
      to: process.env.EMAIL_USER!,
      code: "123456",
      step: 1,
    })

    return { success: true, message: "Email service is working correctly" }
  } catch (error) {
    return {
      success: false,
      message: "Email service test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

