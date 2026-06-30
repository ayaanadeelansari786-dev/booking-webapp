"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns";
import { displayCreatedAt, displayDate, displayTime } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { bookingStatuses, type Booking, type BookingStatus, type Business, type Technician } from "@/lib/types";
import { SignOutButton } from "@/components/SignOutButton";
type DashboardTableProps = {
  business: Business;
  initialBookings: Booking[];
  initialTechnicians: Technician[];
};

type ViewMode = "list" | "calendar";
type SaveField = "status" | "assigned_technician_id" | "scheduled_at";

const filters: Array<"all" | BookingStatus> = ["all", "new", "scheduled", "completed", "cancelled"];

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusClasses(status: BookingStatus) {
  const classes: Record<BookingStatus, string> = {
    new: "bg-blue-700 text-white border-blue-700",
    scheduled: "bg-amber-500 text-slate-950 border-amber-500",
    completed: "bg-emerald-700 text-white border-emerald-700",
    cancelled: "bg-slate-700 text-white border-slate-700"
  };

  return classes[status];
}

function isThisWeek(value: string) {
  const created = new Date(value);
  const now = new Date();
  const day = now.getDay() || 7;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - day + 1);

  return created >= weekStart;
}

function bookingEventDate(booking: Booking) {
  if (booking.scheduled_at) {
    return parseISO(booking.scheduled_at);
  }

  return parseISO(`${booking.booking_date}T${booking.booking_time}`);
}

function formatScheduleInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toIsoFromInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function assignedName(booking: Booking, technicians: Technician[]) {
  return technicians.find((tech) => tech.id === booking.assigned_technician_id)?.name ?? "Unassigned";
}

function requestedLabel(booking: Booking) {
  return `${displayDate(booking.booking_date)} at ${displayTime(booking.booking_time.slice(0, 5))}`;
}

function scheduledLabel(booking: Booking) {
  if (!booking.scheduled_at) return "Not scheduled yet";
  return format(parseISO(booking.scheduled_at), "EEE, MMM d 'at' h:mm a");
}

function isDifferentSchedule(booking: Booking) {
  if (!booking.scheduled_at) return false;
  const requested = parseISO(`${booking.booking_date}T${booking.booking_time}`);
  return Math.abs(parseISO(booking.scheduled_at).getTime() - requested.getTime()) > 60 * 1000;
}

function Details({ booking, technicians }: { booking: Booking; technicians: Technician[] }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
      <p><span className="font-black text-ink">Phone:</span> {booking.customer_phone}</p>
      <p><span className="font-black text-ink">Email:</span> {booking.customer_email || "Not provided"}</p>
      <p><span className="font-black text-ink">Assigned:</span> {assignedName(booking, technicians)}</p>
      <p><span className="font-black text-ink">Created:</span> {displayCreatedAt(booking.created_at)}</p>
      <p className="sm:col-span-2"><span className="font-black text-ink">Full issue:</span> {booking.issue_description || "Not provided"}</p>
    </div>
  );
}

function TechnicianDropdown({
  booking,
  technicians,
  onUpdate,
  saved
}: {
  booking: Booking;
  technicians: Technician[];
  onUpdate: (bookingId: string, field: SaveField, value: string | null) => void;
  saved: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedName = assignedName(booking, technicians);

  function chooseTechnician(technicianId: string | null) {
    setIsOpen(false);
    onUpdate(booking.id, "assigned_technician_id", technicianId);
  }

  return (
    <div className="relative">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign</span>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="mt-2 flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-sm font-medium text-ink shadow-sm transition hover:border-teal-300"
      >
        <span className="truncate">{selectedName}</span>
        <svg aria-hidden="true" className={clsx("h-4 w-4 shrink-0 text-slate-400 transition", isOpen && "rotate-180")} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg">
          {[{ id: "", name: "Unassigned" }, ...technicians].map((technician) => {
            const selected = (booking.assigned_technician_id ?? "") === technician.id;

            return (
              <button
                key={technician.id || "unassigned"}
                type="button"
                onClick={() => chooseTechnician(technician.id || null)}
                className={clsx(
                  "block w-full px-4 py-2 text-left text-sm hover:bg-teal-50",
                  selected ? "font-medium text-teal-600" : "text-slate-700"
                )}
              >
                {technician.name}
              </button>
            );
          })}
        </div>
      ) : null}
      <span className={clsx("mt-2 block text-xs font-medium text-teal-600 transition-opacity duration-300", saved ? "opacity-100" : "opacity-0")} aria-live="polite">
        Saved ✓
      </span>
    </div>
  );
}
function BookingControls({
  booking,
  technicians,
  onUpdate,
  savedKey
}: {
  booking: Booking;
  technicians: Technician[];
  onUpdate: (bookingId: string, field: SaveField, value: string | null) => void;
  savedKey: string | null;
}) {
  const scheduleChanged = isDifferentSchedule(booking);

  return (
    <div className="grid gap-3 lg:grid-cols-[160px_1fr_1fr]">
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">Status</span>
        <select
          value={booking.status}
          onChange={(event) => onUpdate(booking.id, "status", event.target.value)}
          className={clsx("mt-2 min-h-11 w-full rounded-xl border px-3 py-2 text-sm font-black shadow-sm", statusClasses(booking.status))}
        >
          {bookingStatuses.map((status) => (
            <option key={status} value={status}>{statusLabel(status)}</option>
          ))}
        </select>
      </label>
      <TechnicianDropdown booking={booking} technicians={technicians} onUpdate={onUpdate} saved={savedKey === `${booking.id}:assigned_technician_id`} />

      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">Scheduled job time</span>
        <input
          type="datetime-local"
          value={formatScheduleInput(booking.scheduled_at)}
          onChange={(event) => onUpdate(booking.id, "scheduled_at", toIsoFromInput(event.target.value))}
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-ink shadow-sm focus:border-brand"
        />
      </label>
      <div className="lg:col-span-3 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Requested: {requestedLabel(booking)}</span>
        <span className={clsx("rounded-full px-3 py-1", scheduleChanged ? "bg-amber-100 text-amber-950" : "bg-teal-50 text-brand")}>
          Scheduled: {scheduledLabel(booking)}
        </span>
        <span className={clsx("text-emerald-700 transition-opacity duration-300", savedKey ? "opacity-100" : "opacity-0")} aria-live="polite">
          Saved
        </span>
      </div>
    </div>
  );
}

function CalendarGrid({
  month,
  bookings,
  selectedDate,
  onMonthChange,
  onSelectDate
}: {
  month: Date;
  bookings: Booking[];
  selectedDate: Date;
  onMonthChange: (date: Date) => void;
  onSelectDate: (date: Date) => void;
}) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const list: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      list.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return list;
  }, [month]);

  function hasBookings(date: Date) {
    return bookings.some((booking) => isSameDay(bookingEventDate(booking), date));
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-md sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={() => onMonthChange(subMonths(month, 1))} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-ink" aria-label="Previous month">
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1-.02 1.06L9.06 10l3.71 3.71a.75.75 0 1 1-1.06 1.06l-4.24-4.24a.75.75 0 0 1 0-1.06l4.24-4.24a.75.75 0 0 1 1.08 0Z" clipRule="evenodd" /></svg>
        </button>
        <h2 className="text-lg font-semibold text-ink">{format(month, "MMMM yyyy")}</h2>
        <button type="button" onClick={() => onMonthChange(addMonths(month, 1))} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-ink" aria-label="Next month">
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08 0Z" clipRule="evenodd" /></svg>
        </button>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);
          const dotted = hasBookings(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={clsx(
                "flex min-h-16 flex-col items-center justify-center rounded-xl border border-slate-100 p-2 text-sm transition",
                selected && "bg-teal-50",
                !selected && "hover:bg-slate-50",
                inMonth ? "text-ink" : "text-slate-300"
              )}
            >
              <span className={clsx("flex h-7 w-7 items-center justify-center rounded-full font-semibold", today && "bg-brand text-white")}>
                {format(day, "d")}
              </span>
              <span className={clsx("mt-1 h-1.5 w-1.5 rounded-full", dotted ? "bg-teal-500" : "bg-transparent")} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
export function DashboardTable({ business, initialBookings, initialTechnicians }: DashboardTableProps) {
  const [bookings, setBookings] = useState(initialBookings);
  const [technicians, setTechnicians] = useState(initialTechnicians);
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamPhone, setTeamPhone] = useState("");
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  const counts = useMemo(() => {
    return filters.reduce<Record<string, number>>((current, item) => {
      current[item] = item === "all"
        ? bookings.length
        : bookings.filter((booking) => booking.status === item).length;
      return current;
    }, {});
  }, [bookings]);

  const weekCount = useMemo(() => bookings.filter((booking) => isThisWeek(booking.created_at)).length, [bookings]);
  const visibleBookings = bookings.filter((booking) => filter === "all" || booking.status === filter);
  const calendarDayBookings = visibleBookings.filter((booking) => isSameDay(bookingEventDate(booking), selectedCalendarDate));

  async function updateBooking(bookingId: string, field: SaveField, value: string | null) {
    const previous = bookings;
    setError("");
    setSavedKey(null);
    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId ? { ...booking, [field]: value } : booking
      )
    );

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Update could not be saved.");
      }

      if (payload.booking) {
        setBookings((current) => current.map((booking) => booking.id === bookingId ? payload.booking : booking));
      }

      const nextSavedKey = `${bookingId}:${field}`;
      setSavedKey(nextSavedKey);
      window.setTimeout(() => setSavedKey((current) => (current === nextSavedKey ? null : current)), 1600);
    } catch (caught) {
      setBookings(previous);
      setError(caught instanceof Error ? caught.message : "Update could not be saved.");
    }
  }

  async function addTechnician(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsAddingTeam(true);

    try {
      const response = await fetch("/api/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id, name: teamName, phone: teamPhone })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Team member could not be added.");
      }

      setTechnicians((current) => [...current, payload.technician].sort((a, b) => a.name.localeCompare(b.name)));
      setTeamName("");
      setTeamPhone("");
      setShowTeamForm(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Team member could not be added.");
    } finally {
      setIsAddingTeam(false);
    }
  }

  function toggleExpanded(bookingId: string) {
    setExpandedId((current) => (current === bookingId ? null : bookingId));
  }

  function renderBookingCard(booking: Booking) {
    const isExpanded = expandedId === booking.id;

    return (
      <article key={booking.id} className="rounded-2xl border border-white/70 bg-white p-5 shadow-md">
        <button type="button" onClick={() => toggleExpanded(booking.id)} className="w-full text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-ink">{booking.customer_name}</h2>
              <p className="mt-1 text-sm font-bold text-slate-600">Requested: {requestedLabel(booking)}</p>
            </div>
            <span className={clsx("rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide", statusClasses(booking.status))}>
              {statusLabel(booking.status)}
            </span>
          </div>
          <div className="mt-4 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-2">
            <p>{booking.customer_phone}</p>
            <p>{assignedName(booking, technicians)}</p>
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{booking.issue_description || "No issue description provided."}</p>
        </button>
        <div className="mt-5">
          <BookingControls booking={booking} technicians={technicians} onUpdate={updateBooking} savedKey={savedKey?.startsWith(`${booking.id}:`) ? savedKey : null} />
        </div>
        <div className={clsx("grid transition-[grid-template-rows] duration-200", isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden">
            <div className="pt-4">
              <Details booking={booking} technicians={technicians} />
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-brand text-white shadow-md">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70">Owner command center</p>
                <Link href={`/book/${business.id}`} target="_blank" rel="noreferrer" className="text-sm text-slate-300 transition hover:text-teal-200">
                  View booking page ↗
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-white">{business.name}</h1>
                <SignOutButton />
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">Assign jobs, schedule real arrival windows, and keep every booking moving.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 lg:min-w-[480px]">
              <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15">
                <p className="text-sm font-black text-white/70">Total</p>
                <p className="mt-1 text-3xl font-black">{bookings.length}</p>
              </div>
              <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15">
                <p className="text-sm font-black text-white/70">New</p>
                <p className="mt-1 text-3xl font-black text-amber-300">{counts.new ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15">
                <p className="text-sm font-black text-white/70">Week</p>
                <p className="mt-1 text-3xl font-black">{weekCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-md sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-2 overflow-x-auto rounded-2xl bg-slate-100 p-1">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={clsx(
                    "flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition",
                    filter === item
                      ? "bg-accent text-slate-950 shadow-md shadow-amber-900/10"
                      : "text-slate-600 hover:bg-white hover:text-ink"
                  )}
                >
                  <span>{item === "all" ? "All" : statusLabel(item)}</span>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs text-slate-700">{counts[item] ?? 0}</span>
                </button>
              ))}
            </div>
            <div className="flex rounded-2xl bg-slate-100 p-1">
              {(["list", "calendar"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={clsx(
                    "min-h-12 rounded-xl px-4 py-2 text-sm font-black capitalize transition",
                    viewMode === mode ? "bg-brand text-white shadow-md shadow-teal-900/15" : "text-slate-600 hover:bg-white"
                  )}
                >
                  {mode} view
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-bold text-red-700">{error}</p> : null}
        </div>

        <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-md sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-brand">Team</p>
              <p className="text-lg font-black text-ink">{technicians.length} members</p>
            </div>
            <button type="button" onClick={() => setShowTeamForm((current) => !current)} className="rounded-2xl bg-brand px-4 py-3 text-sm font-black text-white shadow-md shadow-teal-900/15">
              + Add team member
            </button>
          </div>
          {showTeamForm ? (
            <form onSubmit={addTechnician} className="mt-4 space-y-3">
              <input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Name" className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold focus:border-brand" required />
              <input value={teamPhone} onChange={(event) => setTeamPhone(formatPhone(event.target.value))} placeholder="Phone optional" className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold focus:border-brand" />
              <button type="submit" disabled={isAddingTeam} className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-black text-slate-950 disabled:bg-slate-300">
                {isAddingTeam ? "Adding" : "Save team member"}
              </button>
            </form>
          ) : null}
          {technicians.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {technicians.map((technician) => <span key={technician.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{technician.name}</span>)}
            </div>
          ) : null}
        </div>
      </div>

      {visibleBookings.length === 0 ? (
        <div className="rounded-2xl border border-white/70 bg-white p-10 text-center shadow-md">
          <h2 className="text-2xl font-black text-ink">No bookings yet</h2>
          <p className="mx-auto mt-3 max-w-md text-base leading-7 text-slate-600">Once a customer books, the request will appear here with assignment and scheduling controls.</p>
        </div>
      ) : viewMode === "calendar" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <CalendarGrid month={calendarMonth} bookings={visibleBookings} selectedDate={selectedCalendarDate} onMonthChange={setCalendarMonth} onSelectDate={setSelectedCalendarDate} />
          <div className="space-y-4">
            <div className="rounded-2xl bg-brand p-5 text-white shadow-md">
              <p className="text-sm font-black uppercase tracking-wide text-white/70">Selected date</p>
              <h2 className="mt-1 text-2xl font-black">{format(selectedCalendarDate, "EEEE, MMM d")}</h2>
              <p className="mt-2 text-sm font-bold text-white/75">{calendarDayBookings.length} booking{calendarDayBookings.length === 1 ? "" : "s"}</p>
            </div>
            {calendarDayBookings.length ? calendarDayBookings.map(renderBookingCard) : (
              <div className="rounded-2xl border border-white/70 bg-white p-6 text-slate-600 shadow-md">No jobs on this date.</div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4 md:hidden">
            {visibleBookings.map(renderBookingCard)}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-white/70 bg-white shadow-md md:block">
            <table className="w-full min-w-[1060px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-black">Requested</th>
                  <th className="px-5 py-4 font-black">Scheduled</th>
                  <th className="px-5 py-4 font-black">Customer</th>
                  <th className="px-5 py-4 font-black">Phone</th>
                  <th className="px-5 py-4 font-black">Issue</th>
                  <th className="px-5 py-4 font-black">Controls</th>
                </tr>
              </thead>
              <tbody>
                {visibleBookings.map((booking) => {
                  const isExpanded = expandedId === booking.id;

                  return (
                    <Fragment key={booking.id}>
                      <tr className="border-t border-slate-200 align-top hover:bg-slate-50">
                        <td onClick={() => toggleExpanded(booking.id)} className="cursor-pointer px-5 py-5 font-black text-ink">{requestedLabel(booking)}</td>
                        <td onClick={() => toggleExpanded(booking.id)} className="cursor-pointer px-5 py-5 font-bold text-slate-700">{scheduledLabel(booking)}</td>
                        <td onClick={() => toggleExpanded(booking.id)} className="cursor-pointer px-5 py-5 font-black text-ink">{booking.customer_name}</td>
                        <td onClick={() => toggleExpanded(booking.id)} className="cursor-pointer px-5 py-5 text-slate-700">{booking.customer_phone}</td>
                        <td onClick={() => toggleExpanded(booking.id)} className="max-w-[220px] cursor-pointer truncate px-5 py-5 text-slate-700">{booking.issue_description || "-"}</td>
                        <td className="px-5 py-4"><BookingControls booking={booking} technicians={technicians} onUpdate={updateBooking} savedKey={savedKey?.startsWith(`${booking.id}:`) ? savedKey : null} /></td>
                      </tr>
                      {isExpanded ? (
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td colSpan={6} className="px-5 py-4"><Details booking={booking} technicians={technicians} /></td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}








