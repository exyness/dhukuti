import "server-only";

export function isAuthorizedIndexerRequest(request: Request, secret: string | undefined) {
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const url = new URL(request.url);
  const authorization = request.headers.get("authorization");
  const heliusSecret = request.headers.get("x-helius-secret");
  const querySecret = url.searchParams.get("secret");

  return authorization === `Bearer ${secret}` || heliusSecret === secret || querySecret === secret;
}
