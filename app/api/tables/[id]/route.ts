import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserCompanyId } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = await getUserCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { companyId },
      select: { id: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const table = await prisma.table.findFirst({
      where: { id, restaurantId: restaurant.id },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    return NextResponse.json(table);
  } catch (error) {
    console.error("Error fetching table:", error);
    return NextResponse.json(
      { error: "Failed to fetch table" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = await getUserCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { companyId },
      select: { id: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const existingTable = await prisma.table.findFirst({
      where: { id, restaurantId: restaurant.id },
    });

    if (!existingTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const data = await request.json();

    if (!data.number || typeof data.number !== "number") {
      return NextResponse.json(
        { error: "Table number is required" },
        { status: 400 }
      );
    }

    if (!data.capacity || typeof data.capacity !== "number" || data.capacity < 1) {
      return NextResponse.json(
        { error: "Capacity must be at least 1" },
        { status: 400 }
      );
    }

    const table = await prisma.table.update({
      where: { id },
      data: {
        number: data.number,
        capacity: data.capacity,
        zone: data.zone || null,
        translations: data.translations !== undefined ? data.translations : existingTable.translations,
        imageUrl: data.imageUrl !== undefined ? (data.imageUrl || null) : existingTable.imageUrl,
        x: data.x !== undefined ? (typeof data.x === "number" ? data.x : null) : existingTable.x,
        y: data.y !== undefined ? (typeof data.y === "number" ? data.y : null) : existingTable.y,
        isActive: data.isActive ?? existingTable.isActive,
      },
    });

    return NextResponse.json(table);
  } catch (error) {
    console.error("Error updating table:", error);
    return NextResponse.json(
      { error: "Failed to update table" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = await getUserCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { companyId },
      select: { id: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const existingTable = await prisma.table.findFirst({
      where: { id, restaurantId: restaurant.id },
    });

    if (!existingTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const data = await request.json();
    const updateData: { isActive?: boolean; x?: number | null; y?: number | null; imageUrl?: string | null } = {};

    if (data.isActive !== undefined) {
      updateData.isActive = Boolean(data.isActive);
    }
    if (data.x !== undefined) {
      updateData.x = typeof data.x === "number" ? data.x : null;
    }
    if (data.y !== undefined) {
      updateData.y = typeof data.y === "number" ? data.y : null;
    }
    if (data.imageUrl !== undefined) {
      updateData.imageUrl = data.imageUrl || null;
    }

    const table = await prisma.table.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, ...table });
  } catch (error) {
    console.error("Error patching table:", error);
    return NextResponse.json(
      { error: "Failed to update table", success: false },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = await getUserCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { companyId },
      select: { id: true },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const existingTable = await prisma.table.findFirst({
      where: { id, restaurantId: restaurant.id },
    });

    if (!existingTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    await prisma.table.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Table deleted" });
  } catch (error) {
    console.error("Error deleting table:", error);
    return NextResponse.json(
      { error: "Failed to delete table" },
      { status: 500 }
    );
  }
}
