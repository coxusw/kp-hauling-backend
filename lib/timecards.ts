import type { DriverHourlyRate, DriverTimecardEntry } from "@/lib/types";

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

export function getTimecardHours(entry: Pick<DriverTimecardEntry, "startTime" | "endTime">) {
  return Math.max((timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime)) / 60, 0);
}

export function displayClockTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return time;
  }
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function getDriverHourlyRate(rates: DriverHourlyRate[], driverId: string) {
  return rates.find((rate) => rate.driverId === driverId)?.hourlyRate ?? 0;
}

export function getDriverTimecardSummary(entries: DriverTimecardEntry[], rate: number) {
  const unpaidEntries = entries.filter((entry) => !entry.paidAt);
  const paidEntries = entries.filter((entry) => entry.paidAt);
  const unpaidHours = unpaidEntries.reduce((total, entry) => total + getTimecardHours(entry), 0);
  const paidHours = paidEntries.reduce((total, entry) => total + getTimecardHours(entry), 0);

  return {
    unpaidEntries,
    paidEntries,
    unpaidHours,
    paidHours,
    owed: unpaidHours * rate
  };
}
