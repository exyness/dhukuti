import { z } from "zod";
import { ingestSignatures } from "@/lib/indexer/ingest";

export const dynamic = "force-dynamic";

const SignatureIngestRequest = z.object({
  signature: z.string().trim().min(32).max(128),
});

export async function POST(request: Request) {
  const parsed = SignatureIngestRequest.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "A valid transaction signature is required." }, { status: 400 });
  }

  try {
    return Response.json(await ingestSignatures([parsed.data.signature]));
  } catch (error) {
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to index this transaction.";
}
