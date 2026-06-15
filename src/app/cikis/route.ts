import { NextResponse } from "next/server";
import { authCookieName } from "@/lib/security-utils";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login?loggedOut=1", request.url));
  response.cookies.delete(authCookieName);
  return response;
}

export async function POST(request: Request) {
  return GET(request);
}
