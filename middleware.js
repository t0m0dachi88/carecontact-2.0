import { NextResponse } from "next/server";

// Middleware does nothing - auth is handled client-side in each page
export function middleware(request) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
