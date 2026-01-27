import { getMatchesByYear } from "@/lib/supabase/queries";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : NaN;

  if (!Number.isFinite(year)) {
    return Response.json({ error: "Invalid year. Use ?year=2025" }, { status: 400 });
  }

  const matches = await getMatchesByYear(year);

  return Response.json({
    year,
    count: matches.length,
    matches,
  });
}
