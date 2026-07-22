# The board is a Next.js static export, and the ground station stays a long-lived Node process

ADR-0003 is titled "we are not using Next.js". This narrows that, and the narrowing
needs stating plainly because the title reads as a flat prohibition.

`web/` is a Next.js app. It is configured `output: 'export'`, so `next build` emits a
directory of static files and no server. Nothing renders on request, no route handler
exists, and no part of the board runs on a server at any point.

## Why ADR-0003's reason still holds

Read the reason rather than the title. ADR-0003 rejected Next.js because **the ground
station** holds persistent connections — a socket or serial port open for the length of a
lesson — and a serverless target cannot do that. The danger it names is architectural
drift: reaching for Next.js would pull the ground station toward something incapable of
the one thing the product exists to do.

That danger is untouched here. `ground-station/` is unchanged: same `node:http` server,
same `ws` WebSocket, same long-lived process. The seam ADR-0003 draws between the two
programs is unchanged, and `contract/` is still the only thing they share. What changed
is which bundler produces the static files on the view side of that seam — Turbopack
rather than Vite — and ADR-0003 gives no reason to care which.

ADR-0003's own consequence section states the property that actually matters: *the
dashboard is a static bundle that knows nothing about radios or protocols*. A static
export satisfies that as completely as a Vite build does.

## The constraint this puts on the board

The board must never acquire a server. Concretely, `web/` may not use route handlers,
server actions, middleware, `next/image` optimisation, ISR, or any dynamic rendering — a
static export forbids all of these at build time, so the configuration enforces the rule
rather than relying on anyone remembering it.

The practical consequence is that everything the board needs at runtime arrives over the
one WebSocket, which is what ADR-0003 wanted anyway.

## Consequences

`ground-station/src/server.ts` already serves a static directory. It can serve `web/out`
exactly as it serves `dashboard/dist` today, so the deployment story — one process, one
port, the board served beside the socket — survives intact and a school still needs no
internet (ADR-0002).

The cost is a heavier toolchain for the view than Vite was, bought for the component and
theming layer described in ADR-0006. Two boards exist during the transition; both run the
same suite against the same Fleet State fixtures, which is what makes comparing them fair.
`dashboard/` is deleted once `web/` is better, and this ADR is wrong the moment anything
in `web/` needs a server.
