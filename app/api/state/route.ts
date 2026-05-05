import { NextResponse } from "next/server";

// Lazy import so the route works even if @vercel/kv isn't configured.
async function getKv() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  const mod = await import("@vercel/kv");
  return mod.kv;
}

const KEY = "childrens-home-state-v1";

export async function GET() {
  try {
    const kv = await getKv();
    if (!kv) {
      return NextResponse.json(
        { ok: false, reason: "kv-not-configured" },
        { status: 503 }
      );
    }
    const state = await kv.get(KEY);
    return NextResponse.json({ ok: true, state: state ?? null });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: "kv-error", error: String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const kv = await getKv();
    if (!kv) {
      return NextResponse.json(
        { ok: false, reason: "kv-not-configured" },
        { status: 503 }
      );
    }
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, reason: "bad-body" }, { status: 400 });
    }
    await kv.set(KEY, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: "kv-error", error: String(err) },
      { status: 500 }
    );
  }
}
