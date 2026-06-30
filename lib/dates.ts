import { addDays, format, isSunday } from "date-fns";

export function getBookableDates() {
  return Array.from({ length: 14 }, (_, offset) => addDays(new Date(), offset));
}

export function isDateSunday(date: Date) {
  return isSunday(date);
}

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function displayDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return format(new Date(year, month - 1, day), "EEEE, MMM d");
}

export function displayCreatedAt(value: string) {
  return format(new Date(value), "MMM d, yyyy h:mm a");
}

export const timeSlots = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00"
];

export function displayTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return format(new Date(2024, 0, 1, hour, minute), "h:mm a");
}
