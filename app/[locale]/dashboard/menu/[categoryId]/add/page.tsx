import { requireAuth } from "../../../_lib/require-auth";
import { MenuItemFormPage } from "../../../_pages/menu-item-form";

export default async function Page({ params }: { params: Promise<{ categoryId: string }> }) {
  await requireAuth();
  const { categoryId } = await params;

  return <MenuItemFormPage categoryId={categoryId} />;
}
