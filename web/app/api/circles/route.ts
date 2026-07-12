import { getCircleSummaries } from "@/lib/supabase/read-model";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const wallet = new URL(request.url).searchParams.get("wallet");
    return Response.json({ circles: await getCircleSummaries(wallet) });
  } catch {
    return Response.json({ error: "Couldn't load circles right now." }, { status: 500 });
  }
}
