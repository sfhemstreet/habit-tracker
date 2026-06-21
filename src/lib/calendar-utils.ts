import { addDays, parseDayKey, startOfWeekKey, toDayKey } from "./date-utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface MonthCell {
  key: string;
  inMonth: boolean;
}

export function buildMonthGrid(anchorKey: string, weekStartsOn: 0 | 1): MonthCell[] {
  const anchor = parseDayKey(anchorKey);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstKey = toDayKey(new Date(year, month, 1));
  const lastKey = toDayKey(new Date(year, month + 1, 0));

  const start = startOfWeekKey(firstKey, weekStartsOn);
  // end = end of the week containing the last day
  const end = addDays(startOfWeekKey(lastKey, weekStartsOn), 6);

  const cells: MonthCell[] = [];
  let cursor = start;
  while (cursor <= end) {
    const d = parseDayKey(cursor);
    cells.push({ key: cursor, inMonth: d.getMonth() === month });
    cursor = addDays(cursor, 1);
  }
  return cells;
}

export function monthLabel(anchorKey: string): string {
  const d = parseDayKey(anchorKey);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function shiftMonth(anchorKey: string, delta: number): string {
  const d = parseDayKey(anchorKey);
  return toDayKey(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}
