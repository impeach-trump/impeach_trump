import { NextResponse, type NextRequest } from "next/server";
import geoidToRepContact from "@/data/geoid_to_rep_contact.json";
import zipToGeoid from "@/data/zip_to_geoid.json";

type RepresentativeContact = {
  contactUrl: string | null;
  geoid: string;
  name: string;
  party: string;
};

const ZIP_TO_GEOID: Record<string, string> = zipToGeoid;
const REP_CONTACTS: Record<string, RepresentativeContact> = geoidToRepContact;

function normalizeZipCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}

export function GET(request: NextRequest) {
  const zipCode = normalizeZipCode(request.nextUrl.searchParams.get("zip") ?? "");

  if (!/^\d{5}$/.test(zipCode)) {
    return NextResponse.json(
      {
        message: "Enter a valid 5-digit ZIP code.",
        status: "invalid",
      },
      { status: 400 },
    );
  }

  const geoid = ZIP_TO_GEOID[zipCode];

  if (!geoid) {
    return NextResponse.json(
      {
        message: `ZIP ${zipCode} is not in the lookup data yet.`,
        status: "not_found",
        zipCode,
      },
      { status: 404 },
    );
  }

  const representative = REP_CONTACTS[geoid];

  if (!representative?.contactUrl) {
    return NextResponse.json(
      {
        geoid,
        message: `ZIP ${zipCode} maps to district ${geoid}, but no contact link is available in this dataset yet.`,
        status: "not_found",
        zipCode,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    representative: {
      contactUrl: representative.contactUrl,
      geoid,
      name: representative.name,
      party: representative.party,
      zipCode,
    },
    status: "found",
  });
}
