"use client";

import { useRouter } from "next/navigation";
import { DishForm } from "../../_v2/forms";
import type { Dish } from "../../_v2/types";

export function EditItemClient({
 dish,
 categoryName,
}: {
 dish: Dish;
 categoryName: string;
}) {
 const router = useRouter();
 return (
 <DishForm
 dish={dish}
 categoryId={dish.categoryId}
 categoryName={categoryName}
 onBack={() => router.push("/dashboard")}
 onSavedRedirect={() => {
 router.push("/dashboard");
 router.refresh();
 }}
 onDeletedRedirect={() => {
 router.push("/dashboard");
 router.refresh();
 }}
 optionRoutePrefix={(id) => `/dashboard/items/${id}/options`}
 />
 );
}
