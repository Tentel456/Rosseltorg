import { NextRequest, NextResponse } from "next/server";
import { openProfile } from "@/lib/open-profile";
import { dishonestSupplier } from "@/lib/rnp";
import { findSupplier } from "@/lib/search";
import { supplierDetails } from "@/lib/supplier-details";

export async function GET(_request: NextRequest, context: { params: Promise<{ inn: string }> }) {
  const { inn } = await context.params;
  const supplier = await findSupplier(inn);
  if (!supplier) return NextResponse.json({ error: "Поставщик не найден" }, { status: 404 });

  const [profile, details, rnp] = await Promise.all([
    openProfile(supplier.inn),
    supplierDetails(supplier.inn),
    dishonestSupplier(supplier.inn),
  ]);
  return NextResponse.json({ supplier, profile, details, rnp });
}
