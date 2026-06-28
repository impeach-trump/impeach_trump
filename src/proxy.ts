import { NextResponse, type NextRequest } from "next/server";
import geoidToRepContact from "./data/geoid_to_rep_contact.json";
import { usRegionCodes } from "./data/states";
import zipToGeoid from "./data/zip_to_geoid.json";

const US_REGION_CODES = new Set<string>(usRegionCodes);
const DETECTED_REP_COOKIES = [
  "detected_rep_zip",
  "detected_rep_geoid",
  "detected_rep_name",
  "detected_rep_party",
  "detected_rep_contact_url",
] as const;
const ZIP_TO_GEOID: Record<string, string> = zipToGeoid;
const REP_CONTACTS: Record<
  string,
  {
    contactUrl: string | null;
    geoid: string;
    name: string;
    party: string;
  }
> = geoidToRepContact;

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const country = request.headers.get("x-vercel-ip-country");
  const region = request.headers
    .get("x-vercel-ip-country-region")
    ?.toUpperCase();
  const zipCode = request.headers.get("x-vercel-ip-postal-code");

  if (country === "US" && region && US_REGION_CODES.has(region)) {
    response.cookies.set("detected_state", region, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
  }

  const geoid =
    country === "US" && zipCode && /^\d{5}$/.test(zipCode)
      ? ZIP_TO_GEOID[zipCode]
      : "";
  const representative = geoid ? REP_CONTACTS[geoid] : null;

  if (zipCode && geoid && representative?.contactUrl) {
    const cookieOptions = {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax" as const,
    };

    response.cookies.set("detected_rep_zip", zipCode, cookieOptions);
    response.cookies.set("detected_rep_geoid", geoid, cookieOptions);
    response.cookies.set(
      "detected_rep_name",
      representative.name,
      cookieOptions,
    );
    response.cookies.set(
      "detected_rep_party",
      representative.party,
      cookieOptions,
    );
    response.cookies.set(
      "detected_rep_contact_url",
      representative.contactUrl,
      cookieOptions,
    );
  } else {
    DETECTED_REP_COOKIES.forEach((cookieName) => {
      response.cookies.delete(cookieName);
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
