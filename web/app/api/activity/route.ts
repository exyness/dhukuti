import { getActivityLog, getCircleActivityLog } from "@/lib/supabase/read-model";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const circle = searchParams.get("circle");
    if (circle) {
      return Response.json({ activity: await getCircleActivityLog(circle) });
    }

    const wallet = searchParams.get("wallet");
    return Response.json({ activity: await getActivityLog(wallet) });
  } catch {
    return Response.json({ error: "Couldn't load activity right now." }, { status: 500 });
  }
}
