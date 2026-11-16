import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/Deploy") {
    return NextResponse.redirect(new URL("/deploy", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/Deploy"],
};