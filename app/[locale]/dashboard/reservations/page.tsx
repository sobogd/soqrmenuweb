import { requireAuth } from "../_lib/require-auth";
import { getReservations, getTables } from "../_lib/queries";
import { ReservationsClient } from "./reservations-client";
import { apiReservationToBooking, apiTableToTable } from "../_v2/mappers";
import type { ApiReservation, ApiTable } from "../_v2/api";

export default async function ReservationsPageRoute() {
  const companyId = await requireAuth();
  const [reservations, tables] = await Promise.all([getReservations(companyId), getTables(companyId)]);
  const initialBookings = (reservations as unknown as ApiReservation[]).map(apiReservationToBooking);
  const initialTables = (tables as unknown as ApiTable[]).map(apiTableToTable);
  return <ReservationsClient initialBookings={initialBookings} initialTables={initialTables} />;
}
