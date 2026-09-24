"use client";

import {
  DAYS,
  DAY_LABELS,
  TIME_OPTIONS,
  formatTime12h,
  type DayKey,
  type OfficeDaySchedule,
  type ServiceDaySchedule,
  type ServiceScheduleMode,
  type WeeklyOfficeSchedule,
  type WeeklyServiceSchedule,
} from "@/lib/onboarding/schedule";

const rowClass =
  "grid grid-cols-1 gap-3 rounded-lg border border-[var(--color-alexander-border)] p-3 sm:grid-cols-[7rem_1fr_1fr_10rem] sm:items-center sm:gap-3";

const selectClass =
  "w-full min-w-0 rounded-lg border border-[var(--color-alexander-border)] bg-white px-2 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-[var(--color-alexander-muted)]";

function TimeSelect({
  id,
  value,
  onChange,
  disabled,
  label,
}: {
  id: string;
  value: string | null;
  onChange: (v: string) => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <select
      id={id}
      aria-label={label}
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={selectClass}
    >
      <option value="">—</option>
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t}>
          {formatTime12h(t)}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/* Office / answering hours — single "Closed" toggle (two states only) */
/* ------------------------------------------------------------------ */

type OfficeProps = {
  schedule: WeeklyOfficeSchedule;
  onChange: (schedule: WeeklyOfficeSchedule) => void;
  dayError?: Partial<Record<DayKey, string>>;
};

export function OfficeWeeklySchedule({ schedule, onChange, dayError }: OfficeProps) {
  const updateDay = (day: DayKey, patch: Partial<OfficeDaySchedule>) => {
    const current = schedule[day];
    let next = { ...current, ...patch };
    if (patch.closed === true) {
      next = { closed: true, start: null, end: null };
    }
    if (patch.closed === false) {
      next = {
        closed: false,
        start: next.start ?? "08:00",
        end: next.end ?? "17:00",
      };
    }
    onChange({ ...schedule, [day]: next });
  };

  return (
    <div className="space-y-3">
      <div className="hidden text-xs text-[var(--color-alexander-muted)] sm:grid sm:grid-cols-[7rem_1fr_1fr_10rem] sm:gap-3 sm:px-3">
        <span />
        <span>Opens</span>
        <span>Closes</span>
        <span>Availability</span>
      </div>
      {DAYS.map((day) => {
        const row = schedule[day];
        const disabled = row.closed;
        return (
          <div key={day} className={rowClass}>
            <span className="text-sm font-medium text-[var(--color-alexander-navy)]">
              {DAY_LABELS[day]}
            </span>
            <div>
              <span className="mb-1 block text-xs text-[var(--color-alexander-muted)] sm:hidden">
                Opens
              </span>
              <TimeSelect
                id={`${day}-start`}
                label={`${DAY_LABELS[day]} opening time`}
                value={row.start}
                disabled={disabled}
                onChange={(v) => updateDay(day, { start: v })}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs text-[var(--color-alexander-muted)] sm:hidden">
                Closes
              </span>
              <TimeSelect
                id={`${day}-end`}
                label={`${DAY_LABELS[day]} closing time`}
                value={row.end}
                disabled={disabled}
                onChange={(v) => updateDay(day, { end: v })}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs text-[var(--color-alexander-muted)] sm:hidden">
                Availability
              </span>
              <select
                id={`${day}-availability`}
                aria-label={`${DAY_LABELS[day]} availability`}
                value={row.closed ? "closed" : "open"}
                onChange={(e) => updateDay(day, { closed: e.target.value === "closed" })}
                className={selectClass}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            {dayError?.[day] && (
              <p className="text-sm text-[var(--color-alexander-required)] sm:col-span-4" role="alert">
                {dayError[day]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Service availability — single mutually-exclusive mode select       */
/* ------------------------------------------------------------------ */

const SERVICE_MODE_OPTIONS: { value: ServiceScheduleMode; label: string }[] = [
  { value: "regular", label: "Regular hours" },
  { value: "no_service", label: "No service" },
  { value: "twenty_four_hours", label: "24-hour service" },
];

type ServiceProps = {
  schedule: WeeklyServiceSchedule;
  onChange: (schedule: WeeklyServiceSchedule) => void;
  dayError?: Partial<Record<DayKey, string>>;
};

export function ServiceWeeklySchedule({ schedule, onChange, dayError }: ServiceProps) {
  const updateDay = (day: DayKey, patch: Partial<ServiceDaySchedule>) => {
    const current = schedule[day];
    let next: ServiceDaySchedule = { ...current, ...patch };

    if (patch.mode === "regular") {
      next = {
        mode: "regular",
        start: current.start ?? "08:00",
        end: current.end ?? "18:00",
      };
    } else if (patch.mode === "no_service" || patch.mode === "twenty_four_hours") {
      next = { mode: patch.mode, start: null, end: null };
    }

    onChange({ ...schedule, [day]: next });
  };

  return (
    <div className="space-y-3">
      <div className="hidden text-xs text-[var(--color-alexander-muted)] sm:grid sm:grid-cols-[7rem_1fr_1fr_10rem] sm:gap-3 sm:px-3">
        <span />
        <span>From</span>
        <span>To</span>
        <span>Availability</span>
      </div>
      {DAYS.map((day) => {
        const row = schedule[day];
        const timesDisabled = row.mode !== "regular";
        return (
          <div key={day} className={rowClass}>
            <span className="text-sm font-medium text-[var(--color-alexander-navy)]">
              {DAY_LABELS[day]}
            </span>
            <div>
              <span className="mb-1 block text-xs text-[var(--color-alexander-muted)] sm:hidden">
                From
              </span>
              <TimeSelect
                id={`svc-${day}-from`}
                label={`${DAY_LABELS[day]} service from`}
                value={row.start}
                disabled={timesDisabled}
                onChange={(v) => updateDay(day, { mode: "regular", start: v })}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs text-[var(--color-alexander-muted)] sm:hidden">
                To
              </span>
              <TimeSelect
                id={`svc-${day}-to`}
                label={`${DAY_LABELS[day]} service to`}
                value={row.end}
                disabled={timesDisabled}
                onChange={(v) => updateDay(day, { mode: "regular", end: v })}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs text-[var(--color-alexander-muted)] sm:hidden">
                Availability
              </span>
              <select
                id={`svc-${day}-availability`}
                aria-label={`${DAY_LABELS[day]} availability`}
                value={row.mode}
                onChange={(e) => updateDay(day, { mode: e.target.value as ServiceScheduleMode })}
                className={selectClass}
              >
                {SERVICE_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {dayError?.[day] && (
              <p className="text-sm text-[var(--color-alexander-required)] sm:col-span-4" role="alert">
                {dayError[day]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
