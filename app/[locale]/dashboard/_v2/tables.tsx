"use client";

import { useEffect, useState } from "react";
import { PlusIcon, QrIcon, TrashIcon } from "./icons";
import {
  ConfirmDialog,
  PhotoPicker,
  SubpageStickyBar,
  TableQrModal,
} from "./ui";
import { inputClass } from "./tokens";
import { newId } from "./helpers";
import { createTable, deleteTable, updateTable } from "./api";
import type { Booking, Order, TableEntity } from "./types";

// Floor-map sizing per capacity (px). Linear: 28..56 for 1..10 seats.
function tableSize(capacity: number): number {
  const c = Math.max(1, Math.min(12, capacity || 2));
  return Math.round(28 + (c - 1) * 3);
}

export function FloorMap({
  tables,
  selectedId,
  onSelectTable,
  occupiedIds,
}: {
  tables: TableEntity[];
  selectedId: string | null;
  onSelectTable: (id: string) => void;
  occupiedIds?: Set<string>;
}) {
  const occupied = occupiedIds || new Set<string>();
  return (
    <>
      <style>{`
        .floor-map {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          background-color: rgb(245 245 245);
          border: 1px solid rgb(229 229 229);
          border-radius: 0.75rem;
          overflow: hidden;
        }
        @media (min-width: 768px) {
          .floor-map { width: 280px; height: 280px; aspect-ratio: auto; }
        }
      `}</style>
      <div className="floor-map">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px)," +
              "linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "10% 10%",
          }}
        />
        {tables.map((t) => {
          const isSelected = selectedId === t.id;
          const isOccupied = occupied.has(t.id);
          const size = tableSize(t.capacity);
          const x = t.x ?? 50;
          const y = t.y ?? 50;
          const stateCls = isSelected
            ? "bg-neutral-900 text-white ring-4 ring-neutral-900/20 z-10"
            : isOccupied
              ? "bg-amber-100 text-amber-900 border border-amber-400 hover:border-amber-600"
              : "bg-white text-neutral-900 border border-neutral-300 hover:border-neutral-900";
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTable(t.id)}
              className={
                "absolute flex items-center justify-center rounded-full font-medium tabular-nums transition-all overflow-hidden " +
                stateCls
              }
              style={{
                width: size + "px",
                height: size + "px",
                left: "calc(" + x + "% - " + size / 2 + "px)",
                top: "calc(" + y + "% - " + size / 2 + "px)",
                fontSize: size > 44 ? "14px" : "12px",
              }}
              aria-label={"Table " + t.number}
              title={"Table " + t.number + (t.name ? " · " + t.name : "")}
            >
              {t.photoUrl ? (
                <img src={t.photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : null}
              <span className={t.photoUrl ? "relative z-10 px-1 rounded bg-black/40 text-white" : ""}>
                {t.number}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function TablesPage({
  tables,
  setTables,
  orders,
  bookings,
  menuUrl,
  onBack,
}: {
  tables: TableEntity[];
  setTables: React.Dispatch<React.SetStateAction<TableEntity[]>>;
  orders: Order[];
  bookings: Booking[];
  menuUrl: string;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<TableEntity[]>(tables);
  const [selectedId, setSelectedId] = useState<string | null>(tables[0]?.id ?? null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title?: string;
    message?: string;
    singleButton?: boolean;
    onConfirm?: (() => void) | null;
  }>({ open: false });
  const [qrTable, setQrTable] = useState<TableEntity | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const selected = draft.find((t) => t.id === selectedId) || null;

  const usedIds = new Set<string>([
    ...orders.filter((o) => o.status === "active").map((o) => o.tableId).filter((x): x is string => !!x),
    ...bookings.filter((b) => b.status !== "cancelled").map((b) => b.tableId).filter((x): x is string => !!x),
  ]);

  async function save() {
    // Persist all dirty tables. Compare draft vs initial `tables`.
    const before = new Map(tables.map((t) => [t.id, t]));
    const ops: Promise<unknown>[] = [];
    for (const t of draft) {
      const prev = before.get(t.id);
      const isNew = !prev;
      const changed =
        !prev ||
        prev.number !== t.number ||
        prev.capacity !== t.capacity ||
        prev.name !== t.name ||
        prev.x !== t.x ||
        prev.y !== t.y ||
        prev.photoUrl !== t.photoUrl;
      if (isNew) {
        ops.push(
          createTable({
            number: t.number,
            capacity: t.capacity,
            zone: t.name || null,
            imageUrl: t.photoUrl,
            x: t.x,
            y: t.y,
          }),
        );
      } else if (changed) {
        ops.push(
          updateTable(t.id, {
            number: t.number,
            capacity: t.capacity,
            zone: t.name || null,
            imageUrl: t.photoUrl,
            x: t.x,
            y: t.y,
          }),
        );
      }
    }
    // Delete tables removed in draft.
    const draftIds = new Set(draft.map((t) => t.id));
    for (const t of tables) {
      if (!draftIds.has(t.id)) ops.push(deleteTable(t.id));
    }
    try {
      await Promise.all(ops);
    } catch {
      // best-effort
    }
    setTables(draft);
    onBack();
  }

  function updateTableLocal(id: string, patch: Partial<TableEntity>) {
    setDraft((d) => d.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function addTable() {
    const nextNum = draft.reduce((max, t) => Math.max(max, t.number || 0), 0) + 1;
    const newTable: TableEntity = {
      id: newId(),
      number: nextNum,
      name: "",
      capacity: 2,
      x: 50,
      y: 50,
      photoUrl: null,
      sortOrder: nextNum,
    };
    setDraft((d) => [...d, newTable]);
    setSelectedId(newTable.id);
  }

  function removeTable(id: string) {
    const t = draft.find((x) => x.id === id);
    if (!t) return;
    if (usedIds.has(id)) {
      setConfirmState({
        open: true,
        title: "Can't delete this table",
        message:
          "Table " +
          t.number +
          " has active orders or upcoming bookings. Resolve them first, then try again.",
        singleButton: true,
        onConfirm: null,
      });
      return;
    }
    setConfirmState({
      open: true,
      title: "Delete table?",
      message:
        "Table " +
        t.number +
        (t.name ? " · " + t.name : "") +
        " will be removed from the floor plan.",
      onConfirm: () => {
        setDraft((d) => d.filter((x) => x.id !== id));
        if (selectedId === id) setSelectedId(null);
        setConfirmState({ open: false });
      },
    });
  }

  return (
    <div>
      <SubpageStickyBar onBack={onBack} onSave={save} canSave>
        <button
          type="button"
          onClick={addTable}
          className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
        >
          <PlusIcon size={13} />
          Table
        </button>
      </SubpageStickyBar>

      <div className="max-w-2xl mx-auto pt-5 md:pt-8">
        <div className="mb-5">
          <div className="text-xs text-neutral-500">Settings</div>
          <h2 className="text-xl font-medium text-neutral-900 mt-1">Tables</h2>
        </div>

        <style>{`
          .tables-layout { display: flex; flex-direction: column; gap: 1rem; align-items: flex-start; }
          .tables-col-left { width: 100%; }
          .tables-col-right { width: 100%; min-width: 0; }
          @media (min-width: 768px) {
            .tables-layout { flex-direction: row; }
            .tables-col-left { flex: 0 0 280px; width: 280px; }
            .tables-col-right { flex: 1 1 0%; min-width: 0; width: auto; }
          }
        `}</style>
        <div className="tables-layout">
          <div className="tables-col-left">
            <FloorMap tables={draft} selectedId={selectedId} onSelectTable={setSelectedId} />
          </div>

          <div className="tables-col-right">
            {selected ? (
              <>
                <TableSettings
                  table={selected}
                  onChange={(patch) => updateTableLocal(selected.id, patch)}
                />
                <div className="mt-6 flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQrTable(selected)}
                    className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    <QrIcon size={13} />
                    Show QR code
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTable(selected.id)}
                    className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon size={13} />
                    Delete table
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-neutral-500 text-center py-4">Tap a table on the map to edit it.</p>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        singleButton={confirmState.singleButton}
        onConfirm={confirmState.onConfirm ?? undefined}
        onCancel={() => setConfirmState({ open: false })}
      />

      <TableQrModal
        open={!!qrTable}
        onClose={() => setQrTable(null)}
        tableNumber={qrTable?.number ?? null}
        tableLabel={qrTable?.name ?? ""}
        menuUrl={menuUrl}
      />
    </div>
  );
}

function TableSettings({
  table,
  onChange,
}: {
  table: TableEntity;
  onChange: (patch: Partial<TableEntity>) => void;
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="block text-sm font-medium text-neutral-900">Position X</label>
          <span className="text-[11px] text-neutral-500 tabular-nums">{Math.round(table.x ?? 50)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={table.x ?? 50}
          onChange={(e) => onChange({ x: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="block text-sm font-medium text-neutral-900">Position Y</label>
          <span className="text-[11px] text-neutral-500 tabular-nums">{Math.round(table.y ?? 50)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={table.y ?? 50}
          onChange={(e) => onChange({ y: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 mb-1.5">Name</label>
        <input
          type="text"
          value={table.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Window, Bar, Patio"
          className={inputClass}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">Number</label>
          <input
            type="number"
            min="1"
            value={table.number}
            onChange={(e) => onChange({ number: parseInt(e.target.value, 10) || 1 })}
            className={inputClass + " text-center tabular-nums"}
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium text-neutral-900 mb-1.5">Seats</label>
          <input
            type="number"
            min="1"
            max="20"
            value={table.capacity}
            onChange={(e) => onChange({ capacity: parseInt(e.target.value, 10) || 1 })}
            className={inputClass + " text-center tabular-nums"}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-900 mb-1.5">Photo</label>
        <PhotoPicker
          url={table.photoUrl}
          onChange={(url) => onChange({ photoUrl: url })}
          inputId={"table-photo-" + table.id}
          width="w-full"
        />
      </div>
    </div>
  );
}
