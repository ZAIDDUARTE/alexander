import { object } from "./intake";

// Read-only diagnostic adapter. It is not attached to Lisa and cannot book events.
export async function checkTestCalendar(token: string, calendarId: string, timeMin: string, timeMax: string, fetcher = fetch) {
  if (!token || !calendarId || calendarId === "primary") throw new Error("dedicated_calendar_required");
  const start = Date.parse(timeMin), end = Date.parse(timeMax);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 31 * 86400_000) throw new Error("invalid_interval");
  const metadata = await fetcher(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
  });
  if (!metadata.ok) throw new Error("calendar_unavailable");
  const calendar = object(await metadata.json());
  if (calendar.id !== calendarId || calendar.timeZone !== "America/Los_Angeles") throw new Error("calendar_binding_mismatch");
  const response = await fetcher("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin, timeMax, timeZone: "America/Los_Angeles", items: [{ id: calendarId }] }),
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("calendar_unavailable");
  const calendars = object(object(await response.json()).calendars);
  const result = object(calendars[calendarId]);
  if ((result.errors && (!Array.isArray(result.errors) || result.errors.length)) || !Array.isArray(result.busy)) throw new Error("calendar_availability_unknown");
  const busy = result.busy.map((raw: unknown) => {
    const interval = object(raw);
    if (typeof interval.start !== "string" || typeof interval.end !== "string" || !Number.isFinite(Date.parse(interval.start)) || !Number.isFinite(Date.parse(interval.end))) throw new Error("calendar_response_invalid");
    return { start: interval.start, end: interval.end };
  });
  return { calendarId, timezone: "America/Los_Angeles", busy };
}
