"use client";

import { useState } from "react";
import { MapPinIcon, UsersIcon } from "./icons";
import { ConfirmDialog, EmptyState, PageHeader } from "./ui";
import { formatDayLabel, formatTime, isSameDay } from "./helpers";
import { patchReservation } from "./api";
import type { Booking, TableEntity } from "./types";

const BOOKING_STATUSES: Record<Booking["status"], { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", cls: "bg-secondary text-muted-foreground border-border" },
  completed: { label: "Completed", cls: "bg-secondary text-muted-foreground border-border" },
  "no-show": { label: "No-show", cls: "bg-red-50 text-red-700 border-red-200" },
};

export function ReservationsPage({
  bookings,
  setBookings,
  tables,
}: {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  tables: TableEntity[];
}) {
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title?: string;
    message?: string;
    onConfirm?: () => void;
  }>({ open: false });

  const grouped = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const map = new Map<string, { date: Date; items: Booking[] }>();
    bookings.forEach((b) => {
      if (b.status === "cancelled") return;
      const d = new Date(b.datetime);
      d.setHours(0, 0, 0, 0);
      if (d < today) return;
      const key = d.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, { date: d, items: [] });
      map.get(key)!.items.push(b);
    });
    const days = [...map.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
    days.forEach((d) =>
      d.items.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()),
    );
    return days;
  })();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayGroup = grouped.find((g) => isSameDay(g.date, today));
  const upcomingGroups = grouped.filter((g) => !isSameDay(g.date, today));

  async function setBookingStatus(id: string, status: Booking["status"]) {
    const before = bookings;
    setBookings((bks) => bks.map((b) => (b.id === id ? { ...b, status } : b)));
    try {
      await patchReservation(id, { status });
    } catch {
      setBookings(before);
    }
  }

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title="Bookings"
          subtitle={`You have ${bookings.filter((b) => b.status !== "cancelled").length} upcoming ${bookings.filter((b) => b.status !== "cancelled").length === 1 ? "booking" : "bookings"}.`}
        />

        {grouped.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            subtitle="Once guests book a table, you'll see them here."
          />
        ) : (
          <div className="space-y-6">
            {todayGroup ? (
              <BookingGroup
                date={todayGroup.date}
                items={todayGroup.items}
                tables={tables}
                onStatusChange={setBookingStatus}
                isToday
              />
            ) : (
              <div>
                <div className="text-sm font-medium text-foreground mb-2">Today</div>
                <div className="text-xs text-muted-foreground text-center py-6 px-3 bg-card border border-border rounded-xl">
                  No bookings for today.
                </div>
              </div>
            )}

            {upcomingGroups.map((g) => (
              <BookingGroup
                key={g.date.toISOString()}
                date={g.date}
                items={g.items}
                tables={tables}
                onStatusChange={setBookingStatus}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ open: false })}
      />
    </>
  );
}

function BookingGroup({
  date,
  items,
  tables,
  onStatusChange,
  isToday,
}: {
  date: Date;
  items: Booking[];
  tables: TableEntity[];
  onStatusChange: (id: string, status: Booking["status"]) => void;
  isToday?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <div className="text-sm font-medium text-foreground">{formatDayLabel(date)}</div>
        {!isToday ? (
          <div className="text-xs text-muted-foreground">
            {date.toLocaleDateString([], { day: "numeric", month: "short" })}
          </div>
        ) : null}
        <div className="ml-auto text-xs text-muted-foreground tabular-nums">
          {items.length} {items.length === 1 ? "booking" : "bookings"}
        </div>
      </div>
      <div className="space-y-2">
        {items.map((b) => (
          <BookingCard key={b.id} booking={b} tables={tables} onStatusChange={onStatusChange} />
        ))}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  tables,
  onStatusChange,
}: {
  booking: Booking;
  tables: TableEntity[];
  onStatusChange: (id: string, status: Booking["status"]) => void;
}) {
  const status = BOOKING_STATUSES[booking.status] || BOOKING_STATUSES.pending;
  const time = formatTime(new Date(booking.datetime));
  const table = tables.find((t) => t.id === booking.tableId);

  return (
    <div className="bg-card border border-border rounded-xl p-3.5">
      <div className="mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-medium text-foreground tabular-nums">{time}</div>
          <span
            className={
              "inline-flex items-center h-5 px-2 text-[10px] font-medium border rounded-full " +
              status.cls
            }
          >
            {status.label}
          </span>
        </div>
        <div className="text-sm text-foreground mt-1 truncate">{booking.guestName}</div>
        <div className="text-xs text-muted-foreground truncate">{booking.guestEmail}</div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="inline-flex items-center gap-1">
          <UsersIcon size={12} />
          <span>
            {booking.guests} {booking.guests === 1 ? "guest" : "guests"}
          </span>
        </div>
        <div className="inline-flex items-center gap-1">
          <MapPinIcon size={12} />
          <span>
            {table ? "Table " + table.number + (table.name ? " · " + table.name : "") : "Not assigned"}
          </span>
        </div>
      </div>

      {booking.notes ? (
        <div className="text-xs text-muted-foreground mt-2 px-2 py-1.5 bg-secondary rounded-md">
          {booking.notes}
        </div>
      ) : null}

      {booking.status === "pending" ? (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => onStatusChange(booking.id, "cancelled")}
            className="flex-1 h-8 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => onStatusChange(booking.id, "confirmed")}
            className="flex-1 h-8 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
          >
            Confirm
          </button>
        </div>
      ) : null}
    </div>
  );
}
