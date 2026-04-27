"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ClockIcon, MessageIcon, PlusIcon, ReceiptIcon, TrashIcon } from "./icons";
import { EmptyState, PageHeader } from "./ui";
import { FloorMap } from "./tables";
import { formatPrice, formatTimeShort, minutesSince, currencySymbolOf, parseDecimal, newId } from "./helpers";
import { getMlWithFallback } from "./i18n";
import { inputClass } from "./tokens";
import { createOrder, patchOrder } from "./api";
import type {
  Category,
  Dish,
  DishOption,
  Order,
  OrderItem,
  OrderItemOptionSnapshot,
  OrderItemStatus,
  TableEntity,
} from "./types";

const ITEM_STATUSES: Record<OrderItemStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  cooking: { label: "Cooking", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ready: { label: "Ready", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  served: { label: "Served", cls: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

function calcItemPrice(item: OrderItem): number {
  const base = parseDecimal(item.basePriceSnapshot) || 0;
  const extras = item.options.reduce((sum, o) => sum + (parseDecimal(o.priceDelta) || 0), 0);
  return base + extras;
}

function calcOrderTotal(order: Order): number {
  return order.items.reduce((sum, it) => sum + calcItemPrice(it), 0);
}

type OrdersView =
  | { name: "list" }
  | { name: "order"; orderId: string }
  | { name: "addItem"; orderId: string; step: "category"; categoryId?: undefined; dishId?: undefined }
  | { name: "addItem"; orderId: string; step: "dish"; categoryId: string; dishId?: undefined }
  | { name: "addItem"; orderId: string; step: "configure"; categoryId: string; dishId: string };

export function OrdersPage({
  orders,
  setOrders,
  tables,
  categories,
  defaultLang,
  currency,
}: {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  tables: TableEntity[];
  categories: Category[];
  defaultLang: string;
  currency: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<OrdersView>({ name: "list" });
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const currencySymbol = currencySymbolOf(currency);

  const activeOrders = orders.filter((o) => o.status === "active");
  const currentOrder =
    view.name !== "list" ? orders.find((o) => o.id === view.orderId) || null : null;

  useEffect(() => {
    if (view.name !== "list" && !currentOrder) {
      setView({ name: "list" });
    }
  }, [view, currentOrder]);

  async function persistOrder(orderId: string, patch: Partial<Order>) {
    setOrders((all) => all.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    const next = { ...target, ...patch };
    try {
      await patchOrder(orderId, {
        status: next.status === "active" ? "in_progress" : next.status,
        items: next.items,
        total: calcOrderTotal(next),
      });
    } catch {
      // best-effort
    }
  }

  function setItemStatus(orderId: string, itemId: string, status: OrderItemStatus) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const items = order.items.map((it) => (it.id === itemId ? { ...it, status } : it));
    persistOrder(orderId, { items });
  }

  function removeItem(orderId: string, itemId: string) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const items = order.items.filter((it) => it.id !== itemId);
    persistOrder(orderId, { items });
  }

  function completeOrder(orderId: string) {
    persistOrder(orderId, { status: "completed" });
    setView({ name: "list" });
  }

  function appendItem(orderId: string, item: OrderItem) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const items = [...order.items, item];
    persistOrder(orderId, { items });
  }

  async function startOrderForTable(tableId: string) {
    if (creating) return;
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    setCreating(true);
    try {
      const created = await createOrder({ tableNumber: table.number });
      const newOrder: Order = {
        id: created.id,
        tableId,
        tableNumber: table.number,
        guestName: "",
        createdAt: created.createdAt,
        status: "active",
        items: [],
        total: 0,
      };
      setOrders((all) => [...all, newOrder]);
      setView({ name: "addItem", orderId: created.id, step: "category" });
      router.refresh();
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  }

  // ── Add-item flow drilldown ──

  if (view.name === "addItem" && currentOrder) {
    return (
      <AddItemFlow
        order={currentOrder}
        tables={tables}
        categories={categories}
        defaultLang={defaultLang}
        currencySymbol={currencySymbol}
        view={view}
        setView={setView}
        onCancel={() => setView({ name: "order", orderId: currentOrder.id })}
        onAdd={(item) => {
          appendItem(currentOrder.id, item);
          setView({ name: "order", orderId: currentOrder.id });
        }}
      />
    );
  }

  if (view.name === "order" && currentOrder) {
    return (
      <OrderDetailPage
        order={currentOrder}
        tables={tables}
        defaultLang={defaultLang}
        currencySymbol={currencySymbol}
        onBack={() => setView({ name: "list" })}
        onAddItem={() =>
          setView({ name: "addItem", orderId: currentOrder.id, step: "category" })
        }
        onItemStatusChange={(itemId, status) => setItemStatus(currentOrder.id, itemId, status)}
        onRemoveItem={(itemId) => removeItem(currentOrder.id, itemId)}
        onComplete={() => completeOrder(currentOrder.id)}
      />
    );
  }

  const occupiedIds = new Set(
    activeOrders.map((o) => o.tableId).filter((x): x is string => !!x),
  );
  const selectedTable = selectedTableId ? tables.find((t) => t.id === selectedTableId) : null;
  const selectedTableOrders = selectedTableId
    ? activeOrders.filter((o) => o.tableId === selectedTableId)
    : [];

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Orders"
        subtitle={`You have ${activeOrders.length} active ${activeOrders.length === 1 ? "order" : "orders"}.`}
      />

      <style>{`
        .orders-layout { display: flex; flex-direction: column; gap: 1rem; align-items: flex-start; }
        .orders-col-left { width: 100%; }
        .orders-col-right { width: 100%; min-width: 0; }
        @media (min-width: 768px) {
          .orders-layout { flex-direction: row; }
          .orders-col-left { flex: 0 0 280px; width: 280px; }
          .orders-col-right { flex: 1 1 0%; min-width: 0; width: auto; }
        }
      `}</style>

      <div className="orders-layout">
        <div className="orders-col-left">
          <FloorMap
            tables={tables}
            selectedId={selectedTableId}
            onSelectTable={setSelectedTableId}
            occupiedIds={occupiedIds}
          />
          <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-500">
            <div className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-100 border border-amber-400" />
              Active
            </div>
            <div className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white border border-neutral-300" />
              Free
            </div>
          </div>
        </div>

        <div className="orders-col-right">
          {!selectedTable ? (
            activeOrders.length === 0 ? (
              <EmptyState
                title="No active orders"
                subtitle="Tap a free table on the map to start an order, or wait for guests to place one via the QR menu."
              />
            ) : (
              <div className="text-center py-10 px-4 bg-white border border-neutral-200 rounded-xl">
                <p className="text-sm text-neutral-500">Tap a table on the map to see or start an order.</p>
              </div>
            )
          ) : (
            <div>
              <div className="flex items-baseline justify-between gap-3 mb-2.5">
                <div>
                  <div className="text-sm font-medium text-neutral-900">
                    Table {selectedTable.number}
                    {selectedTable.name ? (
                      <span className="text-neutral-400 font-normal"> · {selectedTable.name}</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {selectedTableOrders.length === 0
                      ? "No active orders"
                      : selectedTableOrders.length +
                        " active " +
                        (selectedTableOrders.length === 1 ? "order" : "orders")}
                  </div>
                </div>
              </div>

              {selectedTableOrders.length > 0 ? (
                <div className="space-y-2.5 mb-3">
                  {selectedTableOrders.map((order) => (
                    <OrderListCard
                      key={order.id}
                      order={order}
                      currencySymbol={currencySymbol}
                      onClick={() => setView({ name: "order", orderId: order.id })}
                      hideTable
                    />
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => startOrderForTable(selectedTable.id)}
                disabled={creating}
                className="w-full h-11 text-sm font-medium text-neutral-500 hover:text-neutral-900 hover:bg-white hover:border-neutral-300 border border-dashed border-neutral-300 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <span className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                ) : (
                  <PlusIcon size={14} />
                )}
                {selectedTableOrders.length === 0 ? "Start order" : "New order"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderListCard({
  order,
  currencySymbol,
  onClick,
  hideTable,
}: {
  order: Order;
  currencySymbol: string;
  onClick: () => void;
  hideTable?: boolean;
}) {
  const total = calcOrderTotal(order);
  const itemsCount = order.items.length;
  const allReady =
    itemsCount > 0 && order.items.every((it) => it.status === "ready" || it.status === "served");
  const anyCooking = order.items.some((it) => it.status === "cooking");

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl p-3.5 transition-colors"
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-sm font-medium text-neutral-900 truncate">
            {hideTable
              ? formatTimeShort(order.createdAt)
              : "Table " + (order.tableNumber ?? "?")}
          </div>
          {allReady ? (
            <span className="inline-flex items-center h-5 px-2 text-[10px] font-medium border rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">
              All ready
            </span>
          ) : anyCooking ? (
            <span className="inline-flex items-center h-5 px-2 text-[10px] font-medium border rounded-full bg-amber-50 text-amber-700 border-amber-200">
              Cooking
            </span>
          ) : null}
        </div>
        <div className="text-sm font-medium text-neutral-900 tabular-nums shrink-0">
          {formatPrice(total, currencySymbol)}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-neutral-500">
        {!hideTable ? (
          <div className="inline-flex items-center gap-1">
            <ClockIcon size={11} />
            <span>{formatTimeShort(order.createdAt)}</span>
          </div>
        ) : null}
        <div className="inline-flex items-center gap-1">
          <ReceiptIcon size={11} />
          <span>
            {itemsCount} {itemsCount === 1 ? "item" : "items"}
          </span>
        </div>
      </div>
    </button>
  );
}

function OrderDetailPage({
  order,
  tables,
  defaultLang,
  currencySymbol,
  onBack,
  onAddItem,
  onItemStatusChange,
  onRemoveItem,
  onComplete,
}: {
  order: Order;
  tables: TableEntity[];
  defaultLang: string;
  currencySymbol: string;
  onBack: () => void;
  onAddItem: () => void;
  onItemStatusChange: (itemId: string, status: OrderItemStatus) => void;
  onRemoveItem: (itemId: string) => void;
  onComplete: () => void;
}) {
  const table = tables.find((t) => t.id === order.tableId);
  const total = calcOrderTotal(order);
  const allServed = order.items.length > 0 && order.items.every((it) => it.status === "served");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div>
      <div
        className="sticky z-10 -mx-4 md:-mx-6 -mt-5 md:-mt-8 px-4 md:px-6 py-2 bg-white/90 backdrop-blur-md border-b border-neutral-200"
        style={{ top: "var(--topbar-h, 0px)" }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 h-8 -ml-1 pl-1 pr-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
          >
            <ChevronLeftIcon size={14} />
            Back
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={order.items.length === 0}
            className="h-8 px-3 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
          >
            Complete order
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-5 md:pt-8">
        <div className="mb-5">
          <div className="text-xs text-neutral-500">Orders</div>
          <h2 className="text-xl font-medium text-neutral-900 mt-1">
            Table {table ? table.number : order.tableNumber ?? "?"}
            {table && table.name ? <span className="text-neutral-400 font-normal"> · {table.name}</span> : null}
          </h2>
          <div className="text-xs text-neutral-500 mt-1">
            Started at {formatTimeShort(order.createdAt)} · {minutesSince(order.createdAt)} min ago
          </div>
        </div>

        {order.items.length === 0 ? (
          <div className="text-center py-8 bg-white border border-neutral-200 rounded-xl mb-3">
            <p className="text-sm text-neutral-500">No items yet.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            {order.items.map((item) => (
              <OrderItemCard
                key={item.id}
                item={item}
                defaultLang={defaultLang}
                currencySymbol={currencySymbol}
                onStatusChange={(status) => onItemStatusChange(item.id, status)}
                onRemove={() => onRemoveItem(item.id)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onAddItem}
          className="w-full h-11 text-sm font-medium text-neutral-500 hover:text-neutral-900 hover:bg-white hover:border-neutral-300 border border-dashed border-neutral-300 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <PlusIcon size={14} />
          Add item
        </button>

        {order.items.length > 0 ? (
          <div className="mt-5 pt-4 border-t border-neutral-200 flex items-center justify-between">
            <div className="text-sm font-medium text-neutral-900">Total</div>
            <div className="text-lg font-medium text-neutral-900 tabular-nums">
              {formatPrice(total, currencySymbol)}
            </div>
          </div>
        ) : null}

        {allServed ? (
          <p className="text-xs text-emerald-700 text-center mt-4">All items served. Ready to complete.</p>
        ) : null}
      </div>
    </div>
  );
}

function OrderItemCard({
  item,
  defaultLang,
  currencySymbol,
  onStatusChange,
  onRemove,
}: {
  item: OrderItem;
  defaultLang: string;
  currencySymbol: string;
  onStatusChange: (status: OrderItemStatus) => void;
  onRemove: () => void;
}) {
  const status = ITEM_STATUSES[item.status] || ITEM_STATUSES.pending;
  const price = calcItemPrice(item);
  const nextStatus: Record<OrderItemStatus, OrderItemStatus> = {
    pending: "cooking",
    cooking: "ready",
    ready: "served",
    served: "pending",
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-3.5">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-neutral-900">
            {getMlWithFallback(item.dishNameSnapshot, defaultLang, defaultLang)}
          </div>
          {item.options.length > 0 ? (
            <div className="text-xs text-neutral-500 mt-0.5">
              {item.options.map((o, i) => (
                <span key={i}>
                  {i > 0 ? " · " : ""}
                  {getMlWithFallback(o.variantName, defaultLang, defaultLang)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="text-sm text-neutral-700 tabular-nums shrink-0">
          {formatPrice(price, currencySymbol)}
        </div>
      </div>

      {item.notes ? (
        <div className="inline-flex items-start gap-1 text-xs text-neutral-600 mt-1 px-2 py-1 bg-neutral-50 rounded-md">
          <MessageIcon size={11} className="mt-0.5 shrink-0" />
          <span>{item.notes}</span>
        </div>
      ) : null}

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
        <button
          type="button"
          onClick={() => onStatusChange(nextStatus[item.status])}
          className={
            "inline-flex items-center h-7 px-2.5 text-[11px] font-medium border rounded-full transition-opacity hover:opacity-80 " +
            status.cls
          }
          title="Tap to change status"
        >
          {status.label}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          aria-label="Remove item"
          title="Remove item"
        >
          <TrashIcon size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Add-item drilldown: category → dish → configure ──

function AddItemFlow({
  order,
  tables,
  categories,
  defaultLang,
  currencySymbol,
  view,
  setView,
  onAdd,
  onCancel,
}: {
  order: Order;
  tables: TableEntity[];
  categories: Category[];
  defaultLang: string;
  currencySymbol: string;
  view: Extract<OrdersView, { name: "addItem" }>;
  setView: React.Dispatch<React.SetStateAction<OrdersView>>;
  onAdd: (item: OrderItem) => void;
  onCancel: () => void;
}) {
  const table = tables.find((t) => t.id === order.tableId);
  const tableLabel = "Table " + (table ? table.number : order.tableNumber ?? "?");

  function goCategory() {
    setView({ name: "addItem", orderId: order.id, step: "category" });
  }
  function goDish(categoryId: string) {
    setView({ name: "addItem", orderId: order.id, step: "dish", categoryId });
  }
  function goConfigure(categoryId: string, dishId: string) {
    setView({ name: "addItem", orderId: order.id, step: "configure", categoryId, dishId });
  }

  if (view.step === "configure") {
    const cat = categories.find((c) => c.id === view.categoryId);
    const dish = cat?.dishes.find((d) => d.id === view.dishId);
    if (!dish) {
      goCategory();
      return null;
    }
    return (
      <ConfigureItemStep
        dish={dish}
        breadcrumb={tableLabel + "  /  Add item"}
        defaultLang={defaultLang}
        currencySymbol={currencySymbol}
        onBack={() => goDish(view.categoryId)}
        onCancel={onCancel}
        onAdd={(itemData) => {
          onAdd({
            id: newId(),
            dishId: dish.id,
            dishNameSnapshot: dish.name,
            basePriceSnapshot: dish.price,
            options: itemData.options,
            notes: itemData.notes,
            status: "pending",
            createdAt: new Date().toISOString(),
          });
        }}
      />
    );
  }

  if (view.step === "dish") {
    const cat = categories.find((c) => c.id === view.categoryId);
    if (!cat) {
      goCategory();
      return null;
    }
    const visibleDishes = cat.dishes.filter((d) => d.visible !== false);
    return (
      <PickerStep
        title={getMlWithFallback(cat.name, defaultLang, defaultLang)}
        breadcrumb={tableLabel + "  /  Add item  /  " + getMlWithFallback(cat.name, defaultLang, defaultLang)}
        onBack={goCategory}
        onCancel={onCancel}
      >
        {visibleDishes.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-6">No dishes in this category.</p>
        ) : (
          <div className="space-y-1">
            {visibleDishes.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => goConfigure(cat.id, d.id)}
                className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <span className="text-sm text-neutral-900 truncate">
                  {getMlWithFallback(d.name, defaultLang, defaultLang)}
                </span>
                <span className="text-sm text-neutral-500 tabular-nums shrink-0">
                  {currencySymbol + d.price}
                </span>
              </button>
            ))}
          </div>
        )}
      </PickerStep>
    );
  }

  return (
    <PickerStep
      title="Add item"
      breadcrumb={tableLabel + "  /  Add item"}
      onBack={onCancel}
      onCancel={onCancel}
      hideCancel
    >
      <div className="space-y-1">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => goDish(c.id)}
            className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <span className="text-sm font-medium text-neutral-900 truncate">
              {getMlWithFallback(c.name, defaultLang, defaultLang)}
            </span>
            <span className="text-xs text-neutral-400 tabular-nums shrink-0">{c.dishes.length}</span>
          </button>
        ))}
      </div>
    </PickerStep>
  );
}

function PickerStep({
  title,
  breadcrumb,
  onBack,
  onCancel,
  hideCancel,
  children,
}: {
  title: string;
  breadcrumb?: string;
  onBack: () => void;
  onCancel: () => void;
  hideCancel?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [title]);
  return (
    <div>
      <div
        className="sticky z-10 -mx-4 md:-mx-6 -mt-5 md:-mt-8 px-4 md:px-6 py-2 bg-white/90 backdrop-blur-md border-b border-neutral-200"
        style={{ top: "var(--topbar-h, 0px)" }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 h-8 -ml-1 pl-1 pr-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
          >
            <ChevronLeftIcon size={14} />
            Back
          </button>
          {!hideCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-5 md:pt-8">
        <div className="mb-5">
          {breadcrumb ? <div className="text-xs text-neutral-500">{breadcrumb}</div> : null}
          <h2 className="text-xl font-medium text-neutral-900 mt-1">{title}</h2>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-2">{children}</div>
      </div>
    </div>
  );
}

function ConfigureItemStep({
  dish,
  breadcrumb,
  defaultLang,
  currencySymbol,
  onBack,
  onCancel,
  onAdd,
}: {
  dish: Dish;
  breadcrumb?: string;
  defaultLang: string;
  currencySymbol: string;
  onBack: () => void;
  onCancel: () => void;
  onAdd: (data: { options: OrderItemOptionSnapshot[]; notes: string }) => void;
}) {
  const [selections, setSelections] = useState<Record<string, string | string[] | null>>(() => {
    const init: Record<string, string | string[] | null> = {};
    (dish.options || []).forEach((opt) => {
      if (opt.type === "single" && opt.required && opt.variants[0]) {
        init[opt.id] = opt.variants[0].id;
      } else if (opt.type === "single") {
        init[opt.id] = null;
      } else {
        init[opt.id] = [];
      }
    });
    return init;
  });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  function toggleVariant(opt: DishOption, variantId: string) {
    setSelections((s) => {
      if (opt.type === "single") {
        if (opt.required) return { ...s, [opt.id]: variantId };
        return { ...s, [opt.id]: s[opt.id] === variantId ? null : variantId };
      }
      const cur = (s[opt.id] as string[]) || [];
      return {
        ...s,
        [opt.id]: cur.includes(variantId) ? cur.filter((v) => v !== variantId) : [...cur, variantId],
      };
    });
  }

  const canAdd = (dish.options || []).every((opt) => {
    if (!opt.required) return true;
    const sel = selections[opt.id];
    if (opt.type === "single") return !!sel;
    return Array.isArray(sel) && sel.length > 0;
  });

  const totalPrice = (() => {
    let total = parseDecimal(dish.price) || 0;
    (dish.options || []).forEach((opt) => {
      const sel = selections[opt.id];
      if (opt.type === "single" && typeof sel === "string") {
        const v = opt.variants.find((vv) => vv.id === sel);
        if (v) total += parseDecimal(v.priceDelta) || 0;
      }
      if (opt.type === "multi" && Array.isArray(sel)) {
        sel.forEach((vid) => {
          const v = opt.variants.find((vv) => vv.id === vid);
          if (v) total += parseDecimal(v.priceDelta) || 0;
        });
      }
    });
    return total;
  })();

  function handleAdd() {
    if (!canAdd) return;
    const items: OrderItemOptionSnapshot[] = [];
    (dish.options || []).forEach((opt) => {
      const sel = selections[opt.id];
      if (opt.type === "single" && typeof sel === "string") {
        const v = opt.variants.find((vv) => vv.id === sel);
        if (v) items.push({ optionName: opt.name, variantName: v.name, priceDelta: v.priceDelta });
      }
      if (opt.type === "multi" && Array.isArray(sel)) {
        sel.forEach((vid) => {
          const v = opt.variants.find((vv) => vv.id === vid);
          if (v) items.push({ optionName: opt.name, variantName: v.name, priceDelta: v.priceDelta });
        });
      }
    });
    onAdd({ options: items, notes: notes.trim() });
  }

  return (
    <div>
      <div
        className="sticky z-10 -mx-4 md:-mx-6 -mt-5 md:-mt-8 px-4 md:px-6 py-2 bg-white/90 backdrop-blur-md border-b border-neutral-200"
        style={{ top: "var(--topbar-h, 0px)" }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 h-8 -ml-1 pl-1 pr-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
          >
            <ChevronLeftIcon size={14} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className="h-8 px-3 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
            >
              Add · {formatPrice(totalPrice, currencySymbol)}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-5 md:pt-8">
        <div className="mb-5">
          {breadcrumb ? <div className="text-xs text-neutral-500">{breadcrumb}</div> : null}
          <h2 className="text-xl font-medium text-neutral-900 mt-1">
            {getMlWithFallback(dish.name, defaultLang, defaultLang)}
          </h2>
          {getMlWithFallback(dish.description, defaultLang, defaultLang) ? (
            <p className="text-sm text-neutral-500 mt-1">
              {getMlWithFallback(dish.description, defaultLang, defaultLang)}
            </p>
          ) : null}
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 md:p-6">
          {(dish.options || []).map((opt, idx) => (
            <div key={opt.id} className={idx > 0 ? "border-t border-neutral-200 mt-5 pt-5" : ""}>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="text-sm font-medium text-neutral-900">
                  {getMlWithFallback(opt.name, defaultLang, defaultLang)}
                </div>
                <div className="text-[11px] text-neutral-500">
                  {opt.required ? "Required" : "Optional"}
                  {opt.type === "multi" ? " · multiple" : ""}
                </div>
              </div>
              <div className="space-y-1.5">
                {opt.variants.map((v) => {
                  const sel = selections[opt.id];
                  const isSelected =
                    opt.type === "single"
                      ? sel === v.id
                      : Array.isArray(sel) && sel.includes(v.id);
                  const delta = parseDecimal(v.priceDelta) || 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleVariant(opt, v.id)}
                      className={
                        "w-full flex items-center justify-between gap-3 px-3 h-10 rounded-lg border transition-colors " +
                        (isSelected
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-400")
                      }
                    >
                      <span className="text-sm truncate">
                        {getMlWithFallback(v.name, defaultLang, defaultLang)}
                      </span>
                      {delta > 0 ? (
                        <span className={"text-xs tabular-nums " + (isSelected ? "text-white/80" : "text-neutral-500")}>
                          +{delta.toFixed(2)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {(dish.options || []).length > 0 ? <div className="border-t border-neutral-200 mt-5 pt-5" /> : null}

          <label htmlFor="item-notes" className="block text-sm font-medium text-neutral-900 mb-1.5">Notes</label>
          <textarea
            id="item-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. no onions, well done"
            className={inputClass + " h-auto py-2 resize-none"}
          />
        </div>
      </div>
    </div>
  );
}

// ── Kitchen page (unchanged structure, just relocated) ──

export function KitchenPage({
  orders,
  setOrders,
  tables,
  categories,
  defaultLang,
}: {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  tables: TableEntity[];
  categories: Category[];
  defaultLang: string;
}) {
  const [, setTick] = useState(0);
  const [statusFilter, setStatusFilter] = useState<OrderItemStatus[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  function setItemStatus(orderId: string, itemId: string, status: OrderItemStatus) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const items = order.items.map((it) => (it.id === itemId ? { ...it, status } : it));
    setOrders((all) => all.map((o) => (o.id === orderId ? { ...o, items } : o)));
    patchOrder(orderId, { items, total: calcOrderTotal({ ...order, items }) }).catch(() => {});
  }

  function toggleStatus(id: OrderItemStatus) {
    setStatusFilter((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  function toggleCategory(id: string) {
    setCategoryFilter((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  const dishToCategory = (() => {
    const map: Record<string, string> = {};
    categories.forEach((cat) => {
      cat.dishes.forEach((d) => {
        map[d.id] = cat.id;
      });
    });
    return map;
  })();

  function filterItems(items: OrderItem[]): OrderItem[] {
    return items.filter((it) => {
      if (it.status === "served") return false;
      if (statusFilter.length > 0 && !statusFilter.includes(it.status)) return false;
      if (categoryFilter.length > 0 && !categoryFilter.includes(dishToCategory[it.dishId])) return false;
      return true;
    });
  }

  const visibleOrders = orders
    .filter((o) => o.status === "active")
    .map((o) => ({ ...o, _filteredItems: filterItems(o.items) }))
    .filter((o) => o._filteredItems.length > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const STATUS_FILTERS: { id: OrderItemStatus; label: string }[] = [
    { id: "pending", label: "Pending" },
    { id: "cooking", label: "Cooking" },
    { id: "ready", label: "Ready" },
  ];

  const pillBase = "shrink-0 inline-flex items-center h-7 px-3 rounded-full text-xs font-medium transition-colors";
  const pillOn = "bg-neutral-900 text-white";
  const pillOff = "bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400";

  return (
    <div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div
        className="sticky z-10 -mx-4 md:-mx-6 -mt-5 md:-mt-8 bg-white/90 backdrop-blur-md border-b border-neutral-200"
        style={{ top: "var(--topbar-h, 0px)" }}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto px-4 md:px-6 py-2 no-scrollbar">
          {STATUS_FILTERS.map((s) => {
            const on = statusFilter.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleStatus(s.id)}
                className={pillBase + " " + (on ? pillOn : pillOff)}
              >
                {s.label}
              </button>
            );
          })}

          {categories.length > 0 ? (
            <div className="shrink-0 self-stretch w-px bg-neutral-200 mx-1" />
          ) : null}

          {categories.map((cat) => {
            const on = categoryFilter.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={pillBase + " " + (on ? pillOn : pillOff)}
              >
                {getMlWithFallback(cat.name, defaultLang, defaultLang)}
              </button>
            );
          })}
        </div>
      </div>

      {visibleOrders.length === 0 ? (
        <div className="max-w-2xl mx-auto pt-5 md:pt-8">
          <EmptyState
            title="Kitchen is clear"
            subtitle="Items will appear here as guests place orders."
          />
        </div>
      ) : (
        <div className="-mx-4 md:-mx-6 mt-5 md:mt-8">
          <div className="overflow-x-auto pb-4 px-4 md:px-6">
            <div className="flex items-stretch gap-3" style={{ width: "max-content" }}>
              {visibleOrders.map((order) => (
                <KitchenOrderCard
                  key={order.id}
                  order={order}
                  filteredItems={order._filteredItems}
                  table={tables.find((t) => t.id === order.tableId) || null}
                  defaultLang={defaultLang}
                  onItemStatusChange={(itemId, status) => setItemStatus(order.id, itemId, status)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KitchenOrderCard({
  order,
  filteredItems,
  table,
  defaultLang,
  onItemStatusChange,
}: {
  order: Order;
  filteredItems: OrderItem[];
  table: TableEntity | null;
  defaultLang: string;
  onItemStatusChange: (itemId: string, status: OrderItemStatus) => void;
}) {
  const items = filteredItems || order.items.filter((it) => it.status !== "served");
  const allReady = items.length > 0 && items.every((it) => it.status === "ready");
  const elapsed = minutesSince(order.createdAt);
  const cardCls = allReady ? "bg-emerald-50 border-emerald-300" : "bg-white border-neutral-200";

  return (
    <div className={"w-72 shrink-0 rounded-xl border " + cardCls + " flex flex-col"}>
      <div className="px-3.5 py-3 border-b border-neutral-200/60">
        <div className="flex items-center justify-between gap-2">
          <div className="text-base font-medium text-neutral-900">
            Table {table ? table.number : order.tableNumber ?? "?"}
          </div>
          <div className="text-xs text-neutral-500 tabular-nums">
            {formatTimeShort(order.createdAt)} · {elapsed} min
          </div>
        </div>
        {table?.name ? <div className="text-xs text-neutral-500 mt-0.5">{table.name}</div> : null}
      </div>

      <div className="flex-1 p-2 space-y-1.5">
        {items.map((item) => (
          <KitchenItem
            key={item.id}
            item={item}
            defaultLang={defaultLang}
            onStatusChange={(status) => onItemStatusChange(item.id, status)}
          />
        ))}
      </div>
    </div>
  );
}

function KitchenItem({
  item,
  defaultLang,
  onStatusChange,
}: {
  item: OrderItem;
  defaultLang: string;
  onStatusChange: (status: OrderItemStatus) => void;
}) {
  const nextStatus: Record<OrderItemStatus, OrderItemStatus> = {
    pending: "cooking",
    cooking: "ready",
    ready: "pending",
    served: "pending",
  };
  const status = ITEM_STATUSES[item.status] || ITEM_STATUSES.pending;

  return (
    <button
      type="button"
      onClick={() => onStatusChange(nextStatus[item.status])}
      className="w-full text-left p-2.5 rounded-lg bg-white border border-neutral-200 hover:border-neutral-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="text-sm font-medium text-neutral-900 leading-tight">
          {getMlWithFallback(item.dishNameSnapshot, defaultLang, defaultLang)}
        </div>
        <span
          className={
            "shrink-0 inline-flex items-center h-5 px-1.5 text-[10px] font-medium border rounded-full " +
            status.cls
          }
        >
          {status.label}
        </span>
      </div>

      {item.options.length > 0 ? (
        <div className="text-xs text-neutral-600">
          {item.options.map((o, i) => (
            <span key={i}>
              {i > 0 ? " · " : ""}
              {getMlWithFallback(o.variantName, defaultLang, defaultLang)}
            </span>
          ))}
        </div>
      ) : null}

      {item.notes ? (
        <div className="inline-flex items-start gap-1 text-xs text-amber-700 mt-1.5 px-1.5 py-0.5 bg-amber-50 rounded">
          <MessageIcon size={11} className="mt-0.5 shrink-0" />
          <span>{item.notes}</span>
        </div>
      ) : null}
    </button>
  );
}
