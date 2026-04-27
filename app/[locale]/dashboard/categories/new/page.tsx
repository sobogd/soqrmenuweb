"use client";

import { useRouter } from "next/navigation";
import { CategoryForm } from "../../_v2/forms";

export default function NewCategoryPage() {
  const router = useRouter();
  return (
    <CategoryForm
      category={null}
      onBack={() => router.push("/dashboard")}
      onSavedRedirect={() => {
        router.push("/dashboard");
        router.refresh();
      }}
      onDeletedRedirect={() => router.push("/dashboard")}
    />
  );
}
