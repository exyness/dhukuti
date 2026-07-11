import { getCircleSummaries } from "@/lib/supabase/read-model";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ circles: await getCircleSummaries() });
  } catch (error) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load circles.";
}
