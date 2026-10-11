// Which commit is live. The audit (PART 12.2) and the deploy check (PART 11.4) read it.
export function GET() {
  return Response.json({
    commit: process.env.CF_PAGES_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'fa1253f',
  });
}
