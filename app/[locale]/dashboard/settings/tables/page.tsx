import { requireAuth } from "../../_lib/require-auth";
import { getTables, getReservations, getOrders } from "../../_lib/queries";
import { apiOrderToOrder, apiReservationToBooking, apiTableToTable } from "../../_v2/mappers";
import type { ApiOrder, ApiReservation, ApiTable } from "../../_v2/api";
import { TablesSettingsClient } from "./tables-client";

export default async function Page() {
 const companyId = await requireAuth();
 const [tables, reservations, orders] = await Promise.all([
 getTables(companyId),
 getReservations(companyId),
 getOrders(companyId),
 ]);
 const apiTables = tables as unknown as ApiTable[];
 const tablesByNumber = new Map(apiTables.map((t) => [t.number, t.id]));
 const initialTables = apiTables.map(apiTableToTable);
 const initialBookings = (reservations as unknown as ApiReservation[]).map(apiReservationToBooking);
 const initialOrders = (orders as unknown as ApiOrder[]).map((o) => apiOrderToOrder(o, tablesByNumber));
 return (
 <TablesSettingsClient
 initialTables={initialTables}
 initialBookings={initialBookings}
 initialOrders={initialOrders}
 />
 );
}
