import { NextResponse } from "next/server";

import { rateLimit } from "@/lib/rate-limit";

const API_WINDOW_MS = 60_000;
const API_LIMIT = 120;

const getClientIp = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
};

export function middleware(request: Request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  // Global IP throttling for public API endpoints.
  const limit = rateLimit(`api:${ip}`, API_LIMIT, API_WINDOW_MS);

  if (!limit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(API_LIMIT),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(limit.resetAt),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(API_LIMIT));
  response.headers.set("X-RateLimit-Remaining", String(limit.remaining));
  response.headers.set("X-RateLimit-Reset", String(limit.resetAt));
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
