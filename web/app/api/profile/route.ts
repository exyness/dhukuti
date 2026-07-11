import { getProfileData } from "@/lib/supabase/read-model";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const wallet = new URL(request.url).searchParams.get("wallet");
    return Response.json({ profile: await getProfileData(wallet) });
  } catch (error) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load profile.";
}
