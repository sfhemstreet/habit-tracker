const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): string {
  return toDayKey(now);
}

export function addDays(key: string, n: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + n);
  return toDayKey(d);
}

export function weekdayOf(key: string): number {
  return parseDayKey(key).getDay();
}

export function eachDayInRange(fromKey: string, toKey: string): string[] {
  const out: string[] = [];
  if (fromKey > toKey) return out;
  let cursor = fromKey;
  while (cursor <= toKey) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function isFuture(key: string, now: Date = new Date()): boolean {
  return key > todayKey(now);
}

export function startOfWeekKey(key: string, weekStartsOn: 0 | 1): string {
  const day = weekdayOf(key);
  const diff = (day - weekStartsOn + 7) % 7;
  return addDays(key, -diff);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const ms = parseDayKey(toKey).getTime() - parseDayKey(fromKey).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatLongDate(key: string): string {
  const d = parseDayKey(key);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
