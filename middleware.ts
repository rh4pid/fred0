import { type NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })

  // Check if user is authenticated
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Check if authentication is complete (all 3 steps)
  if (!token.completedAuth && !request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/meeting-room/:path*",
    "/api/meetings/:path*",
    "/api/users/:path*",
    "/api/signaling/:path*",
  ],
}

