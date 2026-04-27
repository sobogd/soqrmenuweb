"use client";

import { useRouter } from "next/navigation";
import { OptionForm } from "../../../../_v2/forms";
import type { Dish, DishOption } from "../../../../_v2/types";

export function OptionEditClient({
 dish,
 option,
}: {
 dish: Dish;
 option: DishOption | null;
}) {
 const router = useRouter();
 const dishHref = `/dashboard/items/${dish.id}`;
 const dishHrefWithOptions = `${dishHref}#options`;
 return (
 <OptionForm
 dish={dish}
 option={option}
 onBack={() => router.push(dishHrefWithOptions)}
 onSavedRedirect={() => {
 router.push(dishHrefWithOptions);
 router.refresh();
 }}
 onDeletedRedirect={() => {
 router.push(dishHrefWithOptions);
 router.refresh();
 }}
 />
 );
}
