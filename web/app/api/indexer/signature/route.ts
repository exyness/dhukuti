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
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object") {
    const candidate = error as {
      code?: unknown;
      details?: unknown;
      hint?: unknown;
      message?: unknown;
    };
    const message = typeof candidate.message === "string" ? candidate.message : null;
    const details = typeof candidate.details === "string" ? candidate.details : null;
    const hint = typeof candidate.hint === "string" ? candidate.hint : null;
    const code = typeof candidate.code === "string" ? candidate.code : null;

    return [message, details, hint, code ? `Code: ${code}` : null].filter(Boolean).join(" ");
  }

  return "Failed to index this transaction.";
}
