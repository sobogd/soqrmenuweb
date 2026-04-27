"use client";

import { useEffect, useState } from "react";
import { ReservationsPage } from "../_v2/reservations";
import { fetchReservations } from "../_v2/api";
import { apiReservationToBooking } from "../_v2/mappers";
import type { Booking, TableEntity } from "../_v2/types";

export function ReservationsClient({
  initialBookings,
  initialTables,
}: {
  initialBookings: Booking[];
  initialTables: TableEntity[];
}) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);

  // Live refresh every 30s — pending bookings can come in.
  useEffect(() => {
    const id = setInterval(async () => {
      const rs = await fetchReservations();
      setBookings(rs.map(apiReservationToBooking));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  return <ReservationsPage bookings={bookings} setBookings={setBookings} tables={initialTables} />;
}
