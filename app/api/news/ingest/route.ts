import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const ingestSecret = process.env.FINANCE_WORLD_INGEST_SECRET;
  if (!supabaseUrl || !anonKey || !ingestSecret) {
    return NextResponse.json({ error: "News archive configuration is incomplete" }, { status: 500 });
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/finance-world-ingest`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "x-ingest-secret": ingestSecret,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(55000),
    });
    const result = await response.json().catch(() => ({}));
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "News ingestion failed" },
      { status: 502 },
    );
  }
}
