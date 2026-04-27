"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrderSettingsPage } from "../../_v2/settings";
import { useRestaurant } from "../../_v2/restaurant-context";

export default function Page() {
  const router = useRouter();
  const initial = useRestaurant();
  const [restaurant, setRestaurant] = useState(initial);
  return (
    <OrderSettingsPage
      restaurant={restaurant}
      setRestaurant={setRestaurant}
      onBack={() => {
        router.push("/dashboard/settings");
        router.refresh();
      }}
    />
  );
}
