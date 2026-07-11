import { z } from "zod";
import { isAuthorizedIndexerRequest } from "@/lib/indexer/auth";
import { backfillProgramEvents } from "@/lib/indexer/ingest";

export const dynamic = "force-dynamic";

const BackfillRequest = z.object({
  address: z.string().min(32).optional(),
  before: z.string().min(32).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

export async function POST(request: Request) {
  if (
    !isAuthorizedIndexerRequest(
      request,
      process.env.INDEXER_ADMIN_SECRET ?? process.env.HELIUS_WEBHOOK_SECRET,
    )
  ) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = BackfillRequest.parse(await request.json());
    return Response.json(await backfillProgramEvents(body));
  } catch (error) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to backfill events.";
}
