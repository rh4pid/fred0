import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcrypt"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import { sendVerificationEmail } from "@/lib/email-service"
import crypto from "crypto"

const prisma = new PrismaClient()

const generateVerificationCode = () => crypto.randomBytes(3).toString("hex")

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        verificationCode: { label: "Verification Code", type: "text" },
        authStep: { label: "Authentication Step", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.authStep) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          return null
        }

        // Step 1: Password verification and send first email
        if (credentials.authStep === "1" && credentials.password) {
          const isPasswordValid = await compare(credentials.password, user.password)

          if (!isPasswordValid) {
            return null
          }

          const verificationCode = generateVerificationCode()
          await prisma.verificationCode.create({
            data: {
              code: verificationCode,
              userId: user.id,
              type: "STEP_ONE",
              expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            },
          })

          await sendVerificationEmail(user.email, verificationCode, 1)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            authStep: "1",
            completedAuth: false,
          }
        }

        // Step 2: Verify first code and send second email
        else if (credentials.authStep === "2" && credentials.verificationCode) {
          const validCode = await prisma.verificationCode.findFirst({
            where: {
              userId: user.id,
              code: credentials.verificationCode,
              type: "STEP_ONE",
              expiresAt: { gt: new Date() },
            },
          })

          if (!validCode) {
            return null
          }

          // Delete used code
          await prisma.verificationCode.delete({ where: { id: validCode.id } })

          // Generate and send next code
          const newVerificationCode = generateVerificationCode()
          await prisma.verificationCode.create({
            data: {
              code: newVerificationCode,
              userId: user.id,
              type: "STEP_TWO",
              expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            },
          })

          await sendVerificationEmail(user.email, newVerificationCode, 2)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            authStep: "2",
            completedAuth: false,
          }
        }

        // Step 3: Verify second code and send final email
        else if (credentials.authStep === "3" && credentials.verificationCode) {
          const validCode = await prisma.verificationCode.findFirst({
            where: {
              userId: user.id,
              code: credentials.verificationCode,
              type: "STEP_TWO",
              expiresAt: { gt: new Date() },
            },
          })

          if (!validCode) {
            return null
          }

          // Delete used code
          await prisma.verificationCode.delete({ where: { id: validCode.id } })

          // Generate and send final code
          const finalVerificationCode = generateVerificationCode()
          await prisma.verificationCode.create({
            data: {
              code: finalVerificationCode,
              userId: user.id,
              type: "STEP_THREE",
              expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            },
          })

          await sendVerificationEmail(user.email, finalVerificationCode, 3)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            authStep: "3",
            completedAuth: false,
          }
        }

        // Final step: Verify last code and complete authentication
        else if (credentials.authStep === "4" && credentials.verificationCode) {
          const validCode = await prisma.verificationCode.findFirst({
            where: {
              userId: user.id,
              code: credentials.verificationCode,
              type: "STEP_THREE",
              expiresAt: { gt: new Date() },
            },
          })

          if (!validCode) {
            return null
          }

          // Delete used code
          await prisma.verificationCode.delete({ where: { id: validCode.id } })

          // Authentication complete
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            completedAuth: true,
          }
        }

        return null
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.authStep = user.authStep
        token.completedAuth = user.completedAuth
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
        session.user.role = token.role
        session.user.authStep = token.authStep
        session.user.completedAuth = token.completedAuth
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/error",
  },
})

export { handler as GET, handler as POST }

