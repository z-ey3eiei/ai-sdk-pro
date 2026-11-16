import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/Deploy" || pathname === "/deploy") {
    const repo = request.nextUrl.searchParams.get("repo");
    const url = new URL("/workspace/deploy", request.url);
    if (repo) url.searchParams.set("repo", repo);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/Deploy", "/deploy"],
};