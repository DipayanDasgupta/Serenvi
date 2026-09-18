import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isClerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

// Until Clerk keys are configured, serve only the public landing page (and
// backend API traffic) instead of crashing every request with
// "@clerk/nextjs: Missing publishableKey". TODO(clerk): remove fallback.
function unconfiguredMiddleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  if (
    url.pathname === "/" ||
    url.pathname === "/_not-found" ||
    url.pathname === "/sign-in" ||
    url.pathname === "/sign-up" ||
    url.pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }
  url.pathname = "/";
  return NextResponse.redirect(url);
}

export default isClerkConfigured
  ? clerkMiddleware()
  : unconfiguredMiddleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
