import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserCompanyId } from "@/lib/auth";
import { getDemoMenu } from "@/lib/demo-menu";

export async function POST() {
  try {
    const companyId = await getUserCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { companyId },
      select: { defaultLanguage: true },
    });

    const locale = restaurant?.defaultLanguage || "en";
    const preset = getDemoMenu(locale);

    const lastCategory = await prisma.category.findFirst({
      where: { companyId },
      orderBy: { sortOrder: "desc" },
    });
    let nextCategorySort = (lastCategory?.sortOrder ?? 0) + 1;

    await prisma.$transaction(async (tx) => {
      for (const cat of preset) {
        const category = await tx.category.create({
          data: {
            name: cat.name,
            sortOrder: nextCategorySort++,
            companyId,
          },
        });

        let itemSort = 0;
        for (const item of cat.items) {
          await tx.item.create({
            data: {
              name: item.name,
              description: item.description || null,
              price: item.price,
              sortOrder: itemSort++,
              categoryId: category.id,
              companyId,
            },
          });
        }
      }
    });

    prisma.session.updateMany({
      where: { companyId, modifiedMenu: false },
      data: { modifiedMenu: true },
    }).catch(() => {});

    return NextResponse.json({ message: "Demo menu created" }, { status: 201 });
  } catch (error) {
    console.error("Error creating demo menu:", error);
    return NextResponse.json(
      { error: "Failed to create demo menu" },
      { status: 500 }
    );
  }
}
