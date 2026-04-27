"use client";

import { useRouter } from "next/navigation";
import { CategoryForm } from "../../_v2/forms";
import type { Category } from "../../_v2/types";

export function EditCategoryClient({ category }: { category: Category }) {
 const router = useRouter();
 return (
 <CategoryForm
 category={category}
 onBack={() => router.push("/dashboard")}
 onSavedRedirect={() => {
 router.push("/dashboard");
 router.refresh();
 }}
 onDeletedRedirect={() => {
 router.push("/dashboard");
 router.refresh();
 }}
 />
 );
}
