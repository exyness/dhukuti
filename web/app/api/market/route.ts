import { getMarketListings } from "@/lib/supabase/read-model";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ listings: await getMarketListings() });
  } catch {
    return Response.json({ error: "Couldn't load market listings right now." }, { status: 500 });
  }
}
