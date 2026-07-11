import { getProfileData } from "@/lib/supabase/read-model";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const wallet = new URL(request.url).searchParams.get("wallet");
    return Response.json({ profile: await getProfileData(wallet) });
  } catch {
    return Response.json({ error: "Couldn't load this profile right now." }, { status: 500 });
  }
}
