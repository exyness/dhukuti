import { isAuthorizedIndexerRequest } from "@/lib/indexer/auth";
import { ingestHeliusWebhookPayload } from "@/lib/indexer/ingest";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthorizedIndexerRequest(request, process.env.HELIUS_WEBHOOK_SECRET)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    return Response.json(await ingestHeliusWebhookPayload(payload));
  } catch (error) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to ingest Helius webhook.";
}
