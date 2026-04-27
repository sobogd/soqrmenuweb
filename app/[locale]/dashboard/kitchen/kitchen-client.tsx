"use client";

import { useEffect, useState } from "react";
import { KitchenPage } from "../_v2/orders";
import { fetchOrders } from "../_v2/api";
import { apiOrderToOrder } from "../_v2/mappers";
import { useRestaurant } from "../_v2/restaurant-context";
import type { Category, Order, TableEntity } from "../_v2/types";

export function KitchenClient({
  initialOrders,
  initialTables,
  initialCategories,
}: {
  initialOrders: Order[];
  initialTables: TableEntity[];
  initialCategories: Category[];
}) {
  const restaurant = useRestaurant();
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  useEffect(() => {
    const tablesByNumber = new Map(initialTables.map((t) => [t.number, t.id]));
    const id = setInterval(async () => {
      const os = await fetchOrders();
      setOrders(os.map((o) => apiOrderToOrder(o, tablesByNumber)));
    }, 15000);
    return () => clearInterval(id);
  }, [initialTables]);

  return (
    <KitchenPage
      orders={orders}
      setOrders={setOrders}
      tables={initialTables}
      categories={initialCategories}
      defaultLang={restaurant.defaultLang}
    />
  );
}
