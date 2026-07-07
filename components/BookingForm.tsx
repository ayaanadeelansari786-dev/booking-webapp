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
const glassCard = "rounded-2xl border border-white/[0.08] bg-white/[0.05] shadow-2xl shadow-black/25 backdrop-blur-xl";
const fieldClass = "mt-2 w-full rounded-[10px] border border-white/10 bg-white/[0.07] px-4 py-4 text-base font-medium text-white shadow-inner shadow-black/10 transition placeholder:text-[#A0AEC0]/60 focus:border-[#3B82F6] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]";

function isToday(date: Date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function firstAvailableDate(dates: Date[]) {
  return dates.find((date) => !isDateSunday(date)) ?? dates[0];
}

function FieldMessage({ children }: { children?: string }) {
  return <p className="min-h-5 text-sm font-semibold text-red-300">{children ?? ""}</p>;
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
      <section className={clsx("overflow-hidden p-6 sm:p-8", glassCard)}>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#00D4FF]/30 bg-[#00D4FF]/10 text-[#00D4FF] shadow-[0_0_38px_rgba(0,212,255,0.55)]">
          <svg aria-hidden="true" className="h-11 w-11" viewBox="0 0 24 24" fill="none">
            <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="mt-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">You are booked.</h1>
          <p className="mt-3 text-base leading-7 text-[#A0AEC0]">
            Your request is with {business.name}. A confirmation text is on the way.
          </p>
        </div>
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.05] p-5 backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A0AEC0]">Appointment request</p>
          <p className="mt-2 text-xl font-bold tracking-tight text-white">
            {displayDate(confirmed.date)} at {displayTime(confirmed.time)}
          </p>
        </div>
        <p className="mt-5 text-center text-sm leading-6 text-[#A0AEC0]">
          Keep your phone nearby. If anything changes, reply to the text message you received.
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className={clsx("p-5 sm:p-6", glassCard)}>
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A0AEC0]">Step 1</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white">Choose a date</h2>
          </div>
          <p className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-xs font-bold text-[#A0AEC0]">14 days</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {dates.map((date) => {
            const dateKey = toDateKey(date);
            const isSelected = dateKey === selectedDate;
            const today = isToday(date);
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
                  "min-h-24 rounded-2xl border border-white/[0.08] bg-white/[0.05] px-3 py-3 text-left text-white backdrop-blur-xl transition hover:border-[#00D4FF]/45 hover:shadow-[0_0_20px_rgba(0,212,255,0.18)] disabled:cursor-not-allowed",
                  disabled && "opacity-30",
                  isSelected && "border-[#3B82F6]/70 shadow-[0_0_20px_rgba(59,130,246,0.28)]"
                )}
              >
                <span className="block text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span
                  className={clsx(
                    "mt-2 flex h-11 w-11 items-center justify-center rounded-full text-2xl font-bold leading-none text-white",
                    isSelected && "bg-[#3B82F6] shadow-[0_0_22px_rgba(59,130,246,0.5)]",
                    today && !isSelected && "ring-2 ring-[#00D4FF]"
                  )}
                >
                  {date.toLocaleDateString("en-US", { day: "numeric" })}
                </span>
                <span className="mt-2 block text-xs font-semibold text-[#A0AEC0]">
                  {disabled ? "Closed" : today ? "Today" : date.toLocaleDateString("en-US", { month: "short" })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={clsx("p-5 sm:p-6", glassCard)}>
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A0AEC0]">Step 2</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white">Choose a time</h2>
          </div>
          {isRefreshingSlots ? <span className="text-sm font-semibold text-[#A0AEC0]">Checking</span> : null}
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
                  "min-h-12 rounded-full border px-4 py-3 text-center text-sm font-bold transition disabled:cursor-not-allowed",
                  isSelected && "border-[#3B82F6] bg-[#3B82F6] text-white shadow-[0_0_22px_rgba(59,130,246,0.55)]",
                  !isSelected && !isBooked && "border-white/[0.08] bg-white/[0.05] text-white backdrop-blur-xl hover:border-[#00D4FF]/50 hover:shadow-[0_0_18px_rgba(0,212,255,0.18)]",
                  isBooked && "border-white/[0.08] bg-white/[0.03] text-[#A0AEC0] opacity-30 line-through"
                )}
              >
                {displayTime(slot)}
              </button>
            );
          })}
        </div>
        <FieldMessage>{errors.slot}</FieldMessage>
        {allSlotsTaken ? (
          <p className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm font-semibold text-[#A0AEC0]">
            This day is fully booked. Please choose another date.
          </p>
        ) : null}
      </section>

      <section className={clsx("p-5 sm:p-6", glassCard)}>
        <div className="border-b border-white/[0.08] pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A0AEC0]">Step 3</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-white">Tell us how to reach you</h2>
        </div>
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-[#A0AEC0]">Full name</span>
            <input
              value={form.customerName}
              onChange={(event) => {
                setForm({ ...form, customerName: event.target.value });
                setErrors((current) => ({ ...current, customerName: undefined }));
              }}
              className={fieldClass}
              autoComplete="name"
              required
            />
            <FieldMessage>{errors.customerName}</FieldMessage>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#A0AEC0]">Phone number</span>
            <input
              value={form.phone}
              onChange={(event) => {
                setForm({ ...form, phone: formatPhone(event.target.value) });
                setErrors((current) => ({ ...current, phone: undefined }));
              }}
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 123-4567"
              className={fieldClass}
              required
            />
            <FieldMessage>{errors.phone}</FieldMessage>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#A0AEC0]">Email <span className="font-medium text-[#A0AEC0]/70">optional</span></span>
            <input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              type="email"
              autoComplete="email"
              className={fieldClass}
            />
            <FieldMessage />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#A0AEC0]">Brief description of the issue</span>
            <textarea
              value={form.issueDescription}
              onChange={(event) => setForm({ ...form, issueDescription: event.target.value })}
              placeholder="e.g. AC not cooling"
              rows={4}
              className={clsx(fieldClass, "resize-none")}
            />
          </label>
        </div>
      </section>

      {formError ? (
        <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm font-semibold text-red-200 backdrop-blur-xl">{formError}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#3B82F6] px-5 py-4 text-base font-bold text-white shadow-[0_10px_30px_rgba(59,130,246,0.22)] transition hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#A0AEC0]"
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
