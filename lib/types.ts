export type BookingStatus = "new" | "scheduled" | "completed" | "cancelled";

export type Business = {
  id: string;
  name: string;
  logo_url: string | null;
  created_at?: string;
};

export type BusinessAuth = {
  id: string;
  business_id: string;
  email: string;
  created_at: string;
};

export type Technician = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
};

export type Booking = {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  issue_description: string | null;
  booking_date: string;
  booking_time: string;
  status: BookingStatus;
  assigned_technician_id: string | null;
  scheduled_at: string | null;
  created_at: string;
};

export const bookingStatuses: BookingStatus[] = [
  "new",
  "scheduled",
  "completed",
  "cancelled"
];

