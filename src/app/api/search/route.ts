import { NextRequest, NextResponse } from "next/server";
import { companyNames } from "@/lib/company-names";
import { indexInfo, searchSuppliers } from "@/lib/search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const hits = (await searchSuppliers(query)).slice(0, 8);
  const names = await companyNames(hits.map((hit) => hit.inn));

  return NextResponse.json({
    query,
    total: hits.length,
    index: await indexInfo(),
    results: hits.map((hit) => ({ ...hit, name: names[hit.inn] || "" })),
  });
}
