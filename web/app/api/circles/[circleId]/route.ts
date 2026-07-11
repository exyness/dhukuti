import { getCircleDetail } from "@/lib/supabase/read-model";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ circleId: string }> }) {
  try {
    const { circleId } = await context.params;
    const detail = await getCircleDetail(decodeURIComponent(circleId));

    if (!detail) {
      return Response.json({ error: "Circle not found." }, { status: 404 });
    }

    return Response.json({ detail });
  } catch {
    return Response.json({ error: "Couldn't load this circle right now." }, { status: 500 });
  }
}
