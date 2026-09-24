export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayKey = (typeof DAYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export type TimeValue = string; // HH:mm (24h internal)

/** Office/answering schedules only ever have two mutually exclusive states. */
export type OfficeDaySchedule = {
  closed: boolean;
  start: TimeValue | null;
  end: TimeValue | null;
};

/**
 * Service-availability days support three mutually exclusive states.
 * A single `mode` enum (rather than two independent booleans) guarantees
 * the states can never contradict each other.
 */
export type ServiceScheduleMode = "regular" | "no_service" | "twenty_four_hours";

export type ServiceDaySchedule = {
  mode: ServiceScheduleMode;
  start: TimeValue | null;
  end: TimeValue | null;
};

export type WeeklyOfficeSchedule = Record<DayKey, OfficeDaySchedule>;
export type WeeklyServiceSchedule = Record<DayKey, ServiceDaySchedule>;

export function createDefaultOfficeHours(): WeeklyOfficeSchedule {
  const weekday: OfficeDaySchedule = {
    closed: false,
    start: "08:00",
    end: "17:00",
  };
  const weekend: OfficeDaySchedule = {
    closed: true,
    start: null,
    end: null,
  };
  return {
    monday: { ...weekday },
    tuesday: { ...weekday },
    wednesday: { ...weekday },
    thursday: { ...weekday },
    friday: { ...weekday },
    saturday: { ...weekend },
    sunday: { ...weekend },
  };
}

/**
 * Final MD defaults: Monday–Saturday 8:00 AM–6:00 PM (regular),
 * Sunday = No service.
 */
export function createDefaultServiceHours(): WeeklyServiceSchedule {
  const regularDay: ServiceDaySchedule = {
    mode: "regular",
    start: "08:00",
    end: "18:00",
  };
  const noServiceDay: ServiceDaySchedule = {
    mode: "no_service",
    start: null,
    end: null,
  };
  return {
    monday: { ...regularDay },
    tuesday: { ...regularDay },
    wednesday: { ...regularDay },
    thursday: { ...regularDay },
    friday: { ...regularDay },
    saturday: { ...regularDay },
    sunday: { ...noServiceDay },
  };
}

export function createEmptyAnsweringSchedule(): WeeklyOfficeSchedule {
  const empty: OfficeDaySchedule = {
    closed: true,
    start: null,
    end: null,
  };
  return {
    monday: { ...empty },
    tuesday: { ...empty },
    wednesday: { ...empty },
    thursday: { ...empty },
    friday: { ...empty },
    saturday: { ...empty },
    sunday: { ...empty },
  };
}

export const TIME_OPTIONS: TimeValue[] = (() => {
  const options: TimeValue[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      options.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      );
    }
  }
  return options;
})();

export function formatTime12h(time: TimeValue): string {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

/* ------------------------------------------------------------------ */
/* Shared validity helpers (used by both validation and progress calc) */
/* ------------------------------------------------------------------ */

export function isOfficeDayValid(day: OfficeDaySchedule): boolean {
  if (day.closed) return true;
  return Boolean(day.start) && Boolean(day.end) && day.start! < day.end!;
}

export function isOfficeScheduleValid(schedule: WeeklyOfficeSchedule): boolean {
  return DAYS.every((day) => isOfficeDayValid(schedule[day]));
}

export function hasAnyOpenOfficeDay(schedule: WeeklyOfficeSchedule): boolean {
  return DAYS.some((day) => {
    const d = schedule[day];
    return !d.closed && Boolean(d.start) && Boolean(d.end);
  });
}

export function isServiceDayValid(day: ServiceDaySchedule): boolean {
  if (day.mode !== "regular") return true;
  return Boolean(day.start) && Boolean(day.end) && day.start! < day.end!;
}

export function isServiceScheduleValid(schedule: WeeklyServiceSchedule): boolean {
  return DAYS.every((day) => isServiceDayValid(schedule[day]));
}
