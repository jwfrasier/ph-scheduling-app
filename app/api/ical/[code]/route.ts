import { decodeShare, buildIcs } from "../../../lib/data";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const url = new URL(req.url);
  const filterStaffId = url.searchParams.get("staff") ?? undefined;

  const payload = decodeShare(code);
  if (!payload) {
    return new Response("Invalid share code", { status: 404 });
  }

  const ics = buildIcs({
    staff: payload.staff,
    shiftTimes: payload.shiftTimes,
    weekKey: payload.weekKey,
    week: payload.week,
    filterStaffId,
  });

  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "public, max-age=300",
      "content-disposition": `inline; filename="roster-${payload.weekKey}.ics"`,
    },
  });
}
