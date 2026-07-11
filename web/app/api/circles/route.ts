import { getCircleSummaries } from "@/lib/supabase/read-model";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ circles: await getCircleSummaries() });
  } catch {
    return Response.json({ error: "Couldn't load circles right now." }, { status: 500 });
  }
}
