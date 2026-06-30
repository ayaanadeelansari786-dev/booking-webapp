"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  displayDate,
  displayTime,
  getBookableDates,
  isDateSunday,
  timeSlots,
  toDateKey
} from "@/lib/dates";
import { formatPhone, isValidUsPhone } from "@/lib/phone";
import type { Booking, Business } from "@/lib/types";

type SlotBooking = Pick<Booking, "booking_date" | "booking_time" | "status">;

type BookingFormProps = {
  business: Business;
  existingBookings: SlotBooking[];
};

type FormState = {
  customerName: string;
  phone: string;
  email: string;
  issueDescription: string;
};

type FormErrors = Partial<Record<keyof FormState | "slot", string>>;

const initialForm: FormState = {
  customerName: "",
  phone: "",
  email: "",
  issueDescription: ""
};

const slotTakenMessage = "That time was just booked by someone else. Please pick another slot.";

function isToday(date: Date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function firstAvailableDate(dates: Date[]) {
  return dates.find((date) => !isDateSunday(date)) ?? dates[0];
}

function FieldMessage({ children }: { children?: string }) {
  return <p className="min-h-5 text-sm font-semibold text-red-700">{children ?? ""}</p>;
}

export function BookingForm({ business, existingBookings }: BookingFormProps) {
  const dates = useMemo(() => getBookableDates(), []);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(firstAvailableDate(dates)));
  const [selectedTime, setSelectedTime] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [slotBookings, setSlotBookings] = useState<SlotBooking[]>(existingBookings);
  const [isRefreshingSlots, setIsRefreshingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ date: string; time: string } | null>(null);

  async function refreshAvailability(date = selectedDate) {
    setIsRefreshingSlots(true);

    try {
      const response = await fetch(`/api/bookings?businessId=${encodeURIComponent(business.id)}&date=${encodeURIComponent(date)}`);
      const payload = await response.json();

      if (response.ok) {
        setSlotBookings((current) => [
          ...current.filter((booking) => booking.booking_date !== date),
          ...(payload.bookings ?? [])
        ]);
      }
    } finally {
      setIsRefreshingSlots(false);
    }
  }

  useEffect(() => {
    refreshAvailability(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const bookedSlots = useMemo(() => {
    return new Set(
      slotBookings
        .filter((booking) => booking.booking_date === selectedDate && booking.status !== "cancelled")
        .map((booking) => booking.booking_time.slice(0, 5))
    );
  }, [slotBookings, selectedDate]);

  const allSlotsTaken = timeSlots.every((slot) => bookedSlots.has(slot));

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!selectedTime) {
      nextErrors.slot = "Please choose a time slot.";
    }

    if (!form.customerName.trim()) {
      nextErrors.customerName = "Please enter your full name.";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Please enter your phone number.";
    } else if (!isValidUsPhone(form.phone)) {
      nextErrors.phone = "Please enter a valid phone number.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          customerName: form.customerName,
          phone: form.phone,
          email: form.email,
          issueDescription: form.issueDescription,
          bookingDate: selectedDate,
          bookingTime: selectedTime
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 409 || payload.reason === "slot_taken") {
          setSelectedTime("");
          await refreshAvailability(selectedDate);
          throw new Error(slotTakenMessage);
        }

        throw new Error(payload.error || "Something went wrong.");
      }

      setConfirmed({ date: selectedDate, time: selectedTime });
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
        <div className="bg-brand px-6 py-8 text-white sm:px-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-amber-900/20">
            <svg aria-hidden="true" className="h-9 w-9" viewBox="0 0 24 24" fill="none">
              <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight">You are booked.</h1>
          <p className="mt-3 text-lg leading-8 text-white/85">
            Your request is with {business.name}. A confirmation text is on the way.
          </p>
        </div>
        <div className="space-y-5 px-6 py-7 sm:px-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-black uppercase tracking-wide text-brand">Appointment request</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-ink">
              {displayDate(confirmed.date)} at {displayTime(confirmed.time)}
            </p>
          </div>
          <p className="text-lg leading-8 text-slate-600">
            Keep your phone nearby. If anything changes, reply to the text message you received.
          </p>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-white/70 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.12)] sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-brand">Step 1</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-ink">Choose a date</h2>
          </div>
          <p className="rounded-full bg-brand px-4 py-2 text-sm font-black text-white shadow-md shadow-teal-900/10">14 days</p>
        </div>
        <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
          {dates.map((date) => {
            const dateKey = toDateKey(date);
            const isSelected = dateKey === selectedDate;
            const disabled = isDateSunday(date);

            return (
              <button
                key={dateKey}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setSelectedDate(dateKey);
                  setSelectedTime("");
                  setErrors((current) => ({ ...current, slot: undefined }));
                }}
                className={clsx(
                  "min-h-24 min-w-24 rounded-2xl border px-4 py-3 text-left transition",
                  isSelected && "border-accent bg-accent text-white shadow-lg shadow-amber-900/20",
                  !isSelected && !disabled && "border-slate-200 bg-white text-ink shadow-sm hover:border-brand hover:bg-teal-50",
                  disabled && "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                )}
              >
                <span className="block text-sm font-black uppercase tracking-wide opacity-80">
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className="mt-1 block text-3xl font-black leading-none">
                  {date.toLocaleDateString("en-US", { day: "numeric" })}
                </span>
                <span className="mt-2 block text-sm font-bold opacity-85">
                  {disabled ? "Closed" : isToday(date) ? "Today" : date.toLocaleDateString("en-US", { month: "short" })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/70 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.12)] sm:p-7">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-brand">Step 2</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-ink">Choose a time</h2>
          </div>
          {isRefreshingSlots ? <span className="text-sm font-bold text-slate-500">Checking</span> : null}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {timeSlots.map((slot) => {
            const isBooked = bookedSlots.has(slot);
            const isSelected = slot === selectedTime;

            return (
              <button
                key={slot}
                type="button"
                disabled={isBooked || isRefreshingSlots}
                onClick={() => {
                  setSelectedTime(slot);
                  setErrors((current) => ({ ...current, slot: undefined }));
                }}
                className={clsx(
                  "min-h-14 rounded-2xl border px-3 py-3 text-center text-base font-black transition disabled:cursor-not-allowed",
                  isSelected && "border-accent bg-accent text-white shadow-lg shadow-amber-900/20",
                  !isSelected && !isBooked && "border-slate-200 bg-white text-ink shadow-sm hover:border-brand hover:bg-teal-50",
                  isBooked && "border-slate-200 bg-slate-100 text-slate-400 line-through"
                )}
              >
                {displayTime(slot)}
              </button>
            );
          })}
        </div>
        <FieldMessage>{errors.slot}</FieldMessage>
        {allSlotsTaken ? (
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
            This day is fully booked. Please choose another date.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/70 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.12)] sm:p-7">
        <div className="border-b border-slate-100 pb-5">
          <p className="text-sm font-black uppercase tracking-wide text-brand">Step 3</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-ink">Tell us how to reach you</h2>
        </div>
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="text-base font-black text-ink">Full name</span>
            <input
              value={form.customerName}
              onChange={(event) => {
                setForm({ ...form, customerName: event.target.value });
                setErrors((current) => ({ ...current, customerName: undefined }));
              }}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-medium text-ink shadow-sm transition placeholder:text-slate-400 focus:border-brand"
              autoComplete="name"
              required
            />
            <FieldMessage>{errors.customerName}</FieldMessage>
          </label>
          <label className="block">
            <span className="text-base font-black text-ink">Phone number</span>
            <input
              value={form.phone}
              onChange={(event) => {
                setForm({ ...form, phone: formatPhone(event.target.value) });
                setErrors((current) => ({ ...current, phone: undefined }));
              }}
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 123-4567"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-medium text-ink shadow-sm transition placeholder:text-slate-400 focus:border-brand"
              required
            />
            <FieldMessage>{errors.phone}</FieldMessage>
          </label>
          <label className="block">
            <span className="text-base font-black text-ink">Email <span className="font-medium text-slate-500">optional</span></span>
            <input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-medium text-ink shadow-sm transition placeholder:text-slate-400 focus:border-brand"
            />
            <FieldMessage />
          </label>
          <label className="block">
            <span className="text-base font-black text-ink">Brief description of the issue</span>
            <textarea
              value={form.issueDescription}
              onChange={(event) => setForm({ ...form, issueDescription: event.target.value })}
              placeholder="e.g. AC not cooling"
              rows={4}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-medium text-ink shadow-sm transition placeholder:text-slate-400 focus:border-brand"
            />
          </label>
        </div>
      </section>

      {formError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-bold text-red-700">{formError}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-accent px-5 py-4 text-lg font-black text-white shadow-xl shadow-amber-900/20 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/50 border-t-white" aria-hidden="true" />
            Confirming
          </>
        ) : (
          "Confirm booking"
        )}
      </button>
    </form>
  );
}
