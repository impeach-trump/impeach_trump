"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { GA_MEASUREMENT_ID } from "./ga-config";

type GaEventValue = boolean | number | string | null | undefined;
type GaEventParameters = Record<string, GaEventValue>;

function sanitizeEventParameters(parameters: GaEventParameters) {
  return Object.fromEntries(
    Object.entries(parameters)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [
        key,
        typeof value === "boolean" ? (value ? "yes" : "no") : value,
      ]),
  );
}

export function trackGaEvent(
  eventName: string,
  parameters: GaEventParameters = {},
) {
  if (!GA_MEASUREMENT_ID) {
    return;
  }

  sendGAEvent("event", eventName, sanitizeEventParameters(parameters));
}
