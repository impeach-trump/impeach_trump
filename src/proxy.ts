import { NextResponse, type NextRequest } from "next/server";
import { usRegionCodes } from "./data/states";

const US_REGION_CODES = new Set<string>(usRegionCodes);

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const country = request.headers.get("x-vercel-ip-country");
  const region = request.headers
    .get("x-vercel-ip-country-region")
    ?.toUpperCase();

  if (country === "US" && region && US_REGION_CODES.has(region)) {
    response.cookies.set("detected_state", region, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
