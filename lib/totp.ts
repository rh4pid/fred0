import { authenticator } from "otplib"
import qrcode from "qrcode"

interface GenerateTOTPOptions {
  email: string
  serviceName?: string
}

interface VerifyTOTPOptions {
  token: string
  secret: string
}

/**
 * Generates a TOTP secret and QR code for a user
 */
export function generateTOTP({ email, serviceName = "SecureMeet" }: GenerateTOTPOptions) {
  // Generate a secret
  const secret = authenticator.generateSecret()

  // Create the OTP auth URL
  const otpauth = authenticator.keyuri(email, serviceName, secret)

  return {
    secret,
    otpauth,
    async qrCode() {
      return await qrcode.toDataURL(otpauth)
    },
  }
}

/**
 * Verifies a TOTP token against a secret
 */
export function verifyTOTP({ token, secret }: VerifyTOTPOptions): boolean {
  try {
    return authenticator.verify({ token, secret })
  } catch (error) {
    console.error("TOTP verification error:", error)
    return false
  }
}

