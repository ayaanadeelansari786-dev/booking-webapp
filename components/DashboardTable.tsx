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

const filters: Array<"all" | BookingStatus> = ["all", "new", "scheduled", "completed", "cancelled", "archived"];
const glassCard = "rounded-2xl border border-white/[0.08] bg-white/[0.05] shadow-2xl shadow-black/25 backdrop-blur-xl";
const glassInput = "rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-1.5 text-sm font-semibold text-white transition focus:border-[#3B82F6] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]";

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusClasses(status: BookingStatus) {
  const classes: Record<BookingStatus, string> = {
    new: "border-[#3B82F6] bg-[#3B82F6]/20 text-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.3)]",
    scheduled: "border-[#00D4FF] bg-[#00D4FF]/20 text-[#00D4FF] shadow-[0_0_8px_rgba(0,212,255,0.3)]",
    completed: "border-[#10B981] bg-[#10B981]/20 text-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.3)]",
    cancelled: "border-[#EF4444] bg-[#EF4444]/20 text-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.3)]",
    archived: "border-[#A0AEC0] bg-[#A0AEC0]/20 text-[#A0AEC0] shadow-[0_0_8px_rgba(160,174,192,0.3)]"
  };

  return classes[status];
}

function StatusPill({ status, pulse = false }: { status: BookingStatus; pulse?: boolean }) {
  return (
    <span className={clsx("inline-flex rounded-full border px-[10px] py-[3px] text-xs font-semibold uppercase leading-5", statusClasses(status), pulse && "animate-status-pulse")}>
      {statusLabel(status)}
    </span>
  );
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

function Details({
  booking,
  technicians,
  onArchive,
  isArchiving
}: {
  booking: Booking;
  technicians: Technician[];
  onArchive: (bookingId: string) => void;
  isArchiving: boolean;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.07] p-4 text-sm text-[#A0AEC0] backdrop-blur-xl sm:grid-cols-2">
      <p><span className="font-bold text-white">Status:</span> <StatusPill status={booking.status} /></p>
      <p><span className="font-bold text-white">Phone:</span> {booking.customer_phone}</p>
      <p><span className="font-bold text-white">Email:</span> {booking.customer_email || "Not provided"}</p>
      <p><span className="font-bold text-white">Assigned:</span> {assignedName(booking, technicians)}</p>
      <p><span className="font-bold text-white">Created:</span> {displayCreatedAt(booking.created_at)}</p>
      <p className="sm:col-span-2"><span className="font-bold text-white">Full issue:</span> {booking.issue_description || "Not provided"}</p>
      {booking.status !== "archived" ? (
        <div className="sm:col-span-2 flex justify-end">
          <button
            type="button"
            onClick={() => onArchive(booking.id)}
            disabled={isArchiving}
            className="rounded-xl border border-[#A0AEC0]/40 bg-[#A0AEC0]/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#A0AEC0] transition hover:border-[#A0AEC0] hover:bg-[#A0AEC0]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isArchiving ? "Archiving" : "Archive"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function isActiveTechnicianJob(booking: Booking) {
  return booking.status === "new" || booking.status === "scheduled";
}

function isTechnicianHistoryJob(booking: Booking) {
  return booking.status === "completed" || booking.status === "cancelled" || booking.status === "archived";
}

function JobHistoryList({ jobs, emptyText }: { jobs: Booking[]; emptyText: string }) {
  if (jobs.length === 0) {
    return <p className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-[#A0AEC0]">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-white">{job.customer_name}</p>
            <StatusPill status={job.status} />
          </div>
          <p className="mt-1 text-xs font-semibold text-[#A0AEC0]">{requestedLabel(job)}</p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#A0AEC0]">{job.issue_description || "No issue description provided."}</p>
        </div>
      ))}
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
      <span className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Assign</span>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="mt-2 flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-1.5 text-left text-sm font-semibold text-white shadow-sm transition hover:border-[#00D4FF]/50 hover:shadow-[0_0_18px_rgba(0,212,255,0.16)]"
      >
        <span className="truncate">{selectedName}</span>
        <svg aria-hidden="true" className={clsx("h-4 w-4 shrink-0 text-[#A0AEC0] transition", isOpen && "rotate-180")} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#1A2035] shadow-2xl shadow-black/40 backdrop-blur-xl">
          {[{ id: "", name: "Unassigned" }, ...technicians].map((technician) => {
            const selected = (booking.assigned_technician_id ?? "") === technician.id;

            return (
              <button
                key={technician.id || "unassigned"}
                type="button"
                onClick={() => chooseTechnician(technician.id || null)}
                className={clsx(
                  "block w-full px-4 py-2 text-left text-sm text-[#A0AEC0] hover:bg-[#3B82F6]/15 hover:text-white",
                  selected ? "font-semibold text-[#00D4FF]" : "text-[#A0AEC0]"
                )}
              >
                {technician.name}
              </button>
            );
          })}
        </div>
      ) : null}
      <span className={clsx("mt-2 block text-xs font-semibold text-[#00D4FF] transition-opacity duration-300", saved ? "opacity-100" : "opacity-0")} aria-live="polite">
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
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Status</span>
          <StatusPill status={booking.status} pulse={savedKey === `${booking.id}:status`} />
        </div>
        <select
          value={booking.status}
          onChange={(event) => onUpdate(booking.id, "status", event.target.value)}
          className={clsx("mt-2 min-h-10 w-full", glassInput)}
        >
          {bookingStatuses.map((status) => (
            <option key={status} value={status} className="bg-[#1A2035] text-white">{statusLabel(status)}</option>
          ))}
        </select>
      </label>
      <TechnicianDropdown booking={booking} technicians={technicians} onUpdate={onUpdate} saved={savedKey === `${booking.id}:assigned_technician_id`} />

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Scheduled job time</span>
        <input
          type="datetime-local"
          value={formatScheduleInput(booking.scheduled_at)}
          onChange={(event) => onUpdate(booking.id, "scheduled_at", toIsoFromInput(event.target.value))}
          className={clsx("mt-2 min-h-10 w-full", glassInput)}
        />
      </label>
      <div className="lg:col-span-3 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide">
        <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-[#A0AEC0]">Requested: {requestedLabel(booking)}</span>
        <span className={clsx("rounded-full px-3 py-1", scheduleChanged ? "bg-[#00D4FF]/12 text-[#00D4FF]" : "bg-white/[0.05] text-[#A0AEC0]")}>
          Scheduled: {scheduledLabel(booking)}
        </span>
        <span className={clsx("text-[#00D4FF] transition-opacity duration-300", savedKey ? "opacity-100" : "opacity-0")} aria-live="polite">
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
    <section className={clsx("p-4 sm:p-6", glassCard)}>
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={() => onMonthChange(subMonths(month, 1))} className="flex h-10 w-10 items-center justify-center rounded-full text-[#A0AEC0] transition hover:bg-white/[0.07] hover:text-white" aria-label="Previous month">
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1-.02 1.06L9.06 10l3.71 3.71a.75.75 0 1 1-1.06 1.06l-4.24-4.24a.75.75 0 0 1 0-1.06l4.24-4.24a.75.75 0 0 1 1.08 0Z" clipRule="evenodd" /></svg>
        </button>
        <h2 className="text-lg font-semibold text-white">{format(month, "MMMM yyyy")}</h2>
        <button type="button" onClick={() => onMonthChange(addMonths(month, 1))} className="flex h-10 w-10 items-center justify-center rounded-full text-[#A0AEC0] transition hover:bg-white/[0.07] hover:text-white" aria-label="Next month">
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08 0Z" clipRule="evenodd" /></svg>
        </button>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-[#A0AEC0]">
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
                "flex min-h-16 flex-col items-center justify-center rounded-xl border border-white/[0.08] p-2 text-sm transition hover:bg-white/[0.03]",
                selected && "bg-[#3B82F6]/12",
                
                inMonth ? "text-white" : "text-[#A0AEC0]/35"
              )}
            >
              <span className={clsx("flex h-7 w-7 items-center justify-center rounded-full font-semibold", today && "bg-[#3B82F6] text-white shadow-[0_0_16px_rgba(59,130,246,0.45)]")}>
                {format(day, "d")}
              </span>
              <span className={clsx("mt-1 h-1.5 w-1.5 rounded-full", dotted ? "bg-[#00D4FF]" : "bg-transparent")} />
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
  const [showArchived, setShowArchived] = useState(false);
  const [expandedTechnicianId, setExpandedTechnicianId] = useState<string | null>(null);
  const [technicianJobsById, setTechnicianJobsById] = useState<Record<string, Booking[]>>({});
  const [loadingTechnicianId, setLoadingTechnicianId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamPhone, setTeamPhone] = useState("");
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  const listBookings = useMemo(() => {
    return showArchived ? bookings : bookings.filter((booking) => booking.status !== "archived");
  }, [bookings, showArchived]);

  const counts = useMemo(() => {
    return filters.reduce<Record<string, number>>((current, item) => {
      if (item === "all") {
        current[item] = listBookings.length;
      } else if (item === "archived") {
        current[item] = bookings.filter((booking) => booking.status === "archived").length;
      } else {
        current[item] = listBookings.filter((booking) => booking.status === item).length;
      }

      return current;
    }, {});
  }, [bookings, listBookings]);

  const weekCount = useMemo(() => listBookings.filter((booking) => isThisWeek(booking.created_at)).length, [listBookings]);
  const visibleBookings = listBookings.filter((booking) => filter === "all" || booking.status === filter);
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
        setTechnicianJobsById({});
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

  function archiveBooking(bookingId: string) {
    updateBooking(bookingId, "status", "archived");
  }

  function toggleFilter(item: "all" | BookingStatus) {
    if (item === "archived") {
      setShowArchived(true);
    }

    setFilter(item);
  }

  function toggleArchivedVisibility() {
    setShowArchived((current) => {
      if (current && filter === "archived") {
        setFilter("all");
      }

      return !current;
    });
  }

  async function toggleTechnicianHistory(technicianId: string) {
    const opening = expandedTechnicianId !== technicianId;
    setExpandedTechnicianId(opening ? technicianId : null);

    if (!opening || technicianJobsById[technicianId]) {
      return;
    }

    setLoadingTechnicianId(technicianId);
    setError("");

    try {
      const response = await fetch(`/api/technicians/${technicianId}/bookings`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Technician jobs could not be loaded.");
      }

      setTechnicianJobsById((current) => ({
        ...current,
        [technicianId]: payload.bookings ?? []
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Technician jobs could not be loaded.");
    } finally {
      setLoadingTechnicianId((current) => (current === technicianId ? null : current));
    }
  }

  function renderBookingCard(booking: Booking) {
    const isExpanded = expandedId === booking.id;

    return (
      <article key={booking.id} className={clsx("p-5 transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(59,130,246,0.15)]", glassCard)}>
        <button type="button" onClick={() => toggleExpanded(booking.id)} className="w-full text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">{booking.customer_name}</h2>
              <p className="mt-1 text-sm font-medium text-[#A0AEC0]">Requested: {requestedLabel(booking)}</p>
            </div>
            <StatusPill status={booking.status} pulse={savedKey === `${booking.id}:status`} />
          </div>
          <div className="mt-4 grid gap-2 text-sm font-medium text-[#A0AEC0] sm:grid-cols-2">
            <p>{booking.customer_phone}</p>
            <p>{assignedName(booking, technicians)}</p>
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#A0AEC0]">{booking.issue_description || "No issue description provided."}</p>
        </button>
        <div className="mt-5">
          <BookingControls booking={booking} technicians={technicians} onUpdate={updateBooking} savedKey={savedKey?.startsWith(`${booking.id}:`) ? savedKey : null} />
        </div>
        <div className={clsx("overflow-hidden transition-[max-height,opacity] duration-300 ease-out", isExpanded ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0")} >
          <div className="pt-4">
            <Details booking={booking} technicians={technicians} onArchive={archiveBooking} isArchiving={savedKey === `${booking.id}:status`} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <section className="space-y-6">
      <div className={clsx("p-5 sm:p-7", glassCard)}>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#A0AEC0]">Owner command center</p>
                <Link href={`/book/${business.id}`} target="_blank" rel="noreferrer" className="text-sm text-[#A0AEC0] transition hover:text-[#00D4FF]">
                  View booking page ↗
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{business.name}</h1>
                <SignOutButton />
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#A0AEC0]">Assign jobs, schedule real arrival windows, and keep every booking moving.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 lg:min-w-[480px]">
              <div className="animate-fade-slide-up rounded-2xl border-l-4 border-[#3B82F6] bg-white/[0.05] p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(59,130,246,0.15)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Total</p>
                <p className="mt-1 text-3xl font-bold text-white">{listBookings.length}</p>
              </div>
              <div className="animate-fade-slide-up rounded-2xl border-l-4 border-[#3B82F6] bg-white/[0.05] p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(59,130,246,0.15)] [animation-delay:100ms]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">New</p>
                <p className="mt-1 text-3xl font-bold text-white">{counts.new ?? 0}</p>
              </div>
              <div className="animate-fade-slide-up rounded-2xl border-l-4 border-[#3B82F6] bg-white/[0.05] p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(59,130,246,0.15)] [animation-delay:200ms]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Week</p>
                <p className="mt-1 text-3xl font-bold text-white">{weekCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.05] p-1">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleFilter(item)}
                  className={clsx(
                    "flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition",
                    filter === item
                      ? "bg-[#3B82F6] text-white shadow-[0_0_20px_rgba(59,130,246,0.35)]"
                      : "text-[#A0AEC0] hover:bg-white/[0.07] hover:text-white"
                  )}
                >
                  <span>{item === "all" ? "All" : statusLabel(item)}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{counts[item] ?? 0}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={toggleArchivedVisibility}
              className={clsx(
                "min-h-12 rounded-xl border px-4 py-2 text-sm font-black transition",
                showArchived
                  ? "border-[#A0AEC0] bg-[#A0AEC0]/20 text-[#A0AEC0] shadow-[0_0_14px_rgba(160,174,192,0.18)]"
                  : "border-white/[0.08] text-[#A0AEC0] hover:bg-white/[0.07] hover:text-white"
              )}
            >
              {showArchived ? "Hide Archived" : `Show Archived (${counts.archived ?? 0})`}
            </button>
            <div className="flex rounded-2xl border border-white/[0.08] bg-white/[0.05] p-1">
              {(["list", "calendar"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={clsx(
                    "min-h-12 rounded-xl px-4 py-2 text-sm font-black capitalize transition",
                    viewMode === mode ? "bg-[#3B82F6] text-white shadow-[0_0_20px_rgba(59,130,246,0.35)]" : "text-[#A0AEC0] hover:bg-white/[0.07] hover:text-white"
                  )}
                >
                  {mode} view
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm font-semibold text-red-200">{error}</p> : null}
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">Team</p>
              <p className="text-lg font-bold text-white">{technicians.length} members</p>
            </div>
            <button type="button" onClick={() => setShowTeamForm((current) => !current)} className="rounded-xl bg-[#3B82F6] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(59,130,246,0.22)] transition hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
              + Add team member
            </button>
          </div>
          {showTeamForm ? (
            <form onSubmit={addTechnician} className="mt-4 space-y-3">
              <input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Name" className="w-full rounded-[10px] border border-white/10 bg-white/[0.07] px-3 py-2 text-sm font-semibold text-white transition focus:border-[#3B82F6] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]" required />
              <input value={teamPhone} onChange={(event) => setTeamPhone(formatPhone(event.target.value))} placeholder="Phone optional" className="w-full rounded-[10px] border border-white/10 bg-white/[0.07] px-3 py-2 text-sm font-semibold text-white transition focus:border-[#3B82F6] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]" />
              <button type="submit" disabled={isAddingTeam} className="w-full rounded-xl bg-[#3B82F6] px-4 py-3 text-sm font-bold text-white transition hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] disabled:bg-white/10 disabled:text-[#A0AEC0]">
                {isAddingTeam ? "Adding" : "Save team member"}
              </button>
            </form>
          ) : null}
          {technicians.length ? (
            <div className="mt-4 space-y-3">
              {technicians.map((technician) => {
                const technicianBookings = technicianJobsById[technician.id] ?? bookings.filter((booking) => booking.assigned_technician_id === technician.id);
                const activeJobs = technicianBookings.filter(isActiveTechnicianJob);
                const historyJobs = technicianBookings.filter(isTechnicianHistoryJob);
                const isExpanded = expandedTechnicianId === technician.id;
                const isLoading = loadingTechnicianId === technician.id;

                return (
                  <div key={technician.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => toggleTechnicianHistory(technician.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.05]"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{technician.name}</p>
                        <p className="mt-1 text-xs font-semibold text-[#A0AEC0]">{activeJobs.length} active / {historyJobs.length} history</p>
                      </div>
                      <span className={clsx("text-lg text-[#A0AEC0] transition", isExpanded && "rotate-180")}>v</span>
                    </button>
                    <div className={clsx("overflow-hidden transition-[max-height,opacity] duration-300 ease-out", isExpanded ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0")}>
                      <div className="space-y-4 border-t border-white/[0.08] bg-white/[0.03] p-4">
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">Active Jobs</h3>
                            <span className="rounded-full bg-[#3B82F6]/15 px-2 py-0.5 text-xs font-bold text-[#3B82F6]">{activeJobs.length}</span>
                          </div>
                          {isLoading ? <p className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-[#A0AEC0]">Loading jobs...</p> : <JobHistoryList jobs={activeJobs} emptyText="No active jobs assigned." />}
                        </div>
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">History</h3>
                            <span className="rounded-full bg-[#A0AEC0]/15 px-2 py-0.5 text-xs font-bold text-[#A0AEC0]">{historyJobs.length}</span>
                          </div>
                          {isLoading ? <p className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-[#A0AEC0]">Loading history...</p> : <JobHistoryList jobs={historyJobs} emptyText="No completed, cancelled, or archived jobs yet." />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {visibleBookings.length === 0 ? (
        <div className="animate-fade-slide-up rounded-2xl border border-white/[0.08] bg-white/[0.05] p-10 text-center shadow-2xl shadow-black/25 backdrop-blur-xl [animation-delay:300ms]">
          <h2 className="text-2xl font-bold text-white">No bookings yet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#A0AEC0]">Once a customer books, the request will appear here with assignment and scheduling controls.</p>
        </div>
      ) : viewMode === "calendar" ? (
        <div className="animate-fade-slide-up grid gap-6 xl:grid-cols-[1fr_420px] [animation-delay:300ms]">
          <CalendarGrid month={calendarMonth} bookings={visibleBookings} selectedDate={selectedCalendarDate} onMonthChange={setCalendarMonth} onSelectDate={setSelectedCalendarDate} />
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-5 text-white shadow-2xl shadow-black/25 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">Selected date</p>
              <h2 className="mt-1 text-2xl font-bold">{format(selectedCalendarDate, "EEEE, MMM d")}</h2>
              <p className="mt-2 text-sm font-semibold text-[#A0AEC0]">{calendarDayBookings.length} booking{calendarDayBookings.length === 1 ? "" : "s"}</p>
            </div>
            {calendarDayBookings.length ? calendarDayBookings.map(renderBookingCard) : (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-6 text-sm text-[#A0AEC0] shadow-2xl shadow-black/25 backdrop-blur-xl">No jobs on this date.</div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="animate-fade-slide-up space-y-4 md:hidden [animation-delay:300ms]">
            {visibleBookings.map(renderBookingCard)}
          </div>

          <div className="animate-fade-slide-up hidden overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.05] shadow-2xl shadow-black/25 backdrop-blur-xl md:block [animation-delay:300ms]">
            <table className="w-full min-w-[1060px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#A0AEC0]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Requested</th>
                  <th className="px-5 py-4 font-semibold">Scheduled</th>
                  <th className="px-5 py-4 font-semibold">Customer</th>
                  <th className="px-5 py-4 font-semibold">Phone</th>
                  <th className="px-5 py-4 font-semibold">Issue</th>
                  <th className="px-5 py-4 font-semibold">Controls</th>
                </tr>
              </thead>
              <tbody>
                {visibleBookings.map((booking) => {
                  const isExpanded = expandedId === booking.id;

                  return (
                    <Fragment key={booking.id}>
                      <tr className="border-b border-white/[0.05] align-top transition-[background] duration-200 hover:bg-white/[0.03]">
                        <td onClick={() => toggleExpanded(booking.id)} className="cursor-pointer px-5 py-5 font-bold text-white">{requestedLabel(booking)}</td>
                        <td onClick={() => toggleExpanded(booking.id)} className="cursor-pointer px-5 py-5 font-medium text-[#A0AEC0]">{scheduledLabel(booking)}</td>
                        <td onClick={() => toggleExpanded(booking.id)} className="cursor-pointer px-5 py-5 font-bold text-white">{booking.customer_name}</td>
                        <td onClick={() => toggleExpanded(booking.id)} className="cursor-pointer px-5 py-5 text-[#A0AEC0]">{booking.customer_phone}</td>
                        <td onClick={() => toggleExpanded(booking.id)} className="max-w-[220px] cursor-pointer truncate px-5 py-5 text-[#A0AEC0]">{booking.issue_description || "-"}</td>
                        <td className="px-5 py-4"><BookingControls booking={booking} technicians={technicians} onUpdate={updateBooking} savedKey={savedKey?.startsWith(`${booking.id}:`) ? savedKey : null} /></td>
                      </tr>
                      {isExpanded ? (
                        <tr className="animate-expand-panel border-b border-white/[0.05] bg-white/[0.07]">
                          <td colSpan={6} className="px-5 py-4"><Details booking={booking} technicians={technicians} onArchive={archiveBooking} isArchiving={savedKey === `${booking.id}:status`} /></td>
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

      <style jsx global>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes expandPanel {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 480px; }
        }

        @keyframes statusPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .animate-fade-slide-up {
          animation: fadeSlideUp 0.4s ease-out both;
        }

        .animate-expand-panel {
          animation: expandPanel 0.3s ease-out both;
          overflow: hidden;
        }

        .animate-status-pulse {
          animation: statusPulse 0.2s ease-out both;
        }
      `}</style>
    </section>
  );
}

















