"use client";

import { useRouter } from "next/navigation";
import { DishForm } from "../../_v2/forms";

export function NewItemClient({
  categoryId,
  categoryName,
}: {
  categoryId: string;
  categoryName: string;
}) {
  const router = useRouter();
  return (
    <DishForm
      dish={null}
      categoryId={categoryId}
      categoryName={categoryName}
      onBack={() => router.push("/dashboard")}
      onSavedRedirect={() => {
        router.push("/dashboard");
        router.refresh();
      }}
      onDeletedRedirect={() => router.push("/dashboard")}
      // Allow adding options before the dish exists: DishForm will save first
      // (createItem) and use the assigned id to build the option route.
      optionRoutePrefix={(id) => `/dashboard/items/${id}/options`}
    />
  );
}
