import type { Section1Data, ApprovedClaim } from "../types";
import {
  DAYS,
  hasAnyOpenOfficeDay,
  isOfficeDayValid,
  isServiceDayValid,
  type OfficeDaySchedule,
  type ServiceDaySchedule,
} from "../schedule";
import { isValidE164, PHONE_INVALID_MESSAGE } from "../phone";

export type FieldErrors = Partial<Record<string, string>>;

function officeDayError(label: string, day: OfficeDaySchedule): string | null {
  if (isOfficeDayValid(day)) return null;
  if (!day.start || !day.end) {
    return `${label}: start and end times are required when open.`;
  }
  return `${label}: end time must be after start time.`;
}

function serviceDayError(label: string, day: ServiceDaySchedule): string | null {
  if (isServiceDayValid(day)) return null;
  if (!day.start || !day.end) {
    return `${label}: From and To are required for regular service hours.`;
  }
  return `${label}: To must be after From.`;
}

export function validateSection1(data: Section1Data): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.customerFacingName.trim()) {
    errors.customerFacingName = "Company name is required.";
  }

  if (!data.mainPhone.trim()) {
    errors.mainPhone = "Main business phone number is required.";
  } else if (!isValidE164(data.mainPhone.trim())) {
    errors.mainPhone = PHONE_INVALID_MESSAGE;
  }

  if (data.website.trim()) {
    try {
      const url = data.website.trim().match(/^https?:\/\//)
        ? data.website.trim()
        : `https://${data.website.trim()}`;
      new URL(url);
    } catch {
      errors.website = "Enter a valid website URL.";
    }
  }

  if (data.approvedClaims.length === 0) {
    errors.approvedClaims = "Select at least one option.";
  }

  if (data.approvedClaims.includes("other") && !data.otherApprovedClaim.trim()) {
    errors.otherApprovedClaim = "Please describe what else Alexander may tell customers.";
  }

  for (const day of DAYS) {
    const officeErr = officeDayError(day, data.officeHours[day]);
    if (officeErr) errors[`officeHours.${day}`] = officeErr;
  }

  for (const day of DAYS) {
    const serviceErr = serviceDayError(day, data.serviceHours[day]);
    if (serviceErr) errors[`serviceHours.${day}`] = serviceErr;
  }

  if (!data.answeringMode) {
    errors.answeringMode = "Select when Alexander should answer your calls.";
  }

  if (data.answeringMode === "specific_hours") {
    for (const day of DAYS) {
      const err = officeDayError(day, data.answeringSchedule[day]);
      if (err) errors[`answeringSchedule.${day}`] = err;
    }
    const hasOpenDay = hasAnyOpenOfficeDay(data.answeringSchedule);
    if (!hasOpenDay && !Object.keys(errors).some((k) => k.startsWith("answeringSchedule"))) {
      errors.answeringSchedule = "Specify at least one day when Alexander should answer calls.";
    }
  }

  return errors;
}

export function section1IsValid(data: Section1Data): boolean {
  return Object.keys(validateSection1(data)).length === 0;
}

export const APPROVED_CLAIM_OPTIONS: { value: ApprovedClaim; label: string }[] = [
  { value: "licensed", label: "Licensed" },
  { value: "insured", label: "Insured" },
  { value: "bonded", label: "Bonded" },
  { value: "locally_owned", label: "Locally owned" },
  { value: "family_owned", label: "Family owned" },
  { value: "other", label: "Other" },
  { value: "none", label: "None of these" },
];

export const ANSWERING_MODE_OPTIONS = [
  {
    value: "24_7" as const,
    label: "24 hours a day, 7 days a week",
  },
  {
    value: "office_closed_only" as const,
    label: "Only when our office is closed",
  },
  {
    value: "specific_hours" as const,
    label: "Only during specific hours",
  },
];
