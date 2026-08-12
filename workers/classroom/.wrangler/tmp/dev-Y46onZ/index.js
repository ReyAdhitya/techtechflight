var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
function seatAt(seat) {
  const seen = typeof seat.seenAt === "number" ? seat.seenAt : 0;
  const joined = typeof seat.joinedAt === "number" ? seat.joinedAt : 0;
  return Math.max(seen, joined);
}
__name(seatAt, "seatAt");
function merge(incoming, stored) {
  if (stored === null) return incoming;
  const newer = stored.updatedAt > incoming.updatedAt ? stored : incoming;
  const older = newer === stored ? incoming : stored;
  const seats = /* @__PURE__ */ new Map();
  for (const seat of [...older.seats ?? [], ...newer.seats ?? []]) {
    const id = typeof seat.studentId === "string" ? seat.studentId : null;
    if (id === null) continue;
    const held = seats.get(id);
    if (held === void 0 || seatAt(seat) >= seatAt(held)) seats.set(id, seat);
  }
  return { ...newer, seats: [...seats.values()], updatedAt: Math.max(incoming.updatedAt, stored.updatedAt) };
}
__name(merge, "merge");
var TTL_SECONDS = 60 * 60 * 24 * 2;
var CORS = {
  /*
   * Open, because the board is served from Vercel, from a laptop on :4321 and from whatever
   * address a school's iPad reaches it on, and the document behind this is already public to
   * anybody holding four characters a Teacher shouted.
   */
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, PUT, OPTIONS",
  "access-control-allow-headers": "Content-Type"
};
function normalizeCode(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}
__name(normalizeCode, "normalizeCode");
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS }
  });
}
__name(json, "json");
var src_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({ ok: true, store: "cloudflare-kv" });
    }
    const code = normalizeCode(url.searchParams.get("code"));
    if (code.length < 4) {
      return json({ error: "Query code must be at least four characters.", store: "cloudflare-kv" }, 400);
    }
    if (env.CLASSROOMS === void 0) {
      return json(
        { error: "Classroom store is not bound (KV namespace CLASSROOMS).", store: "cloudflare-kv" },
        503
      );
    }
    try {
      if (request.method === "GET") {
        const stored = await env.CLASSROOMS.get(code, "text");
        if (stored === null) {
          return json({ error: "No classroom with that code yet.", store: "cloudflare-kv" }, 404);
        }
        return new Response(stored, {
          status: 200,
          headers: { "content-type": "application/json", ...CORS }
        });
      }
      if (request.method === "PUT") {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object" || typeof body.updatedAt !== "number") {
          return json(
            { error: "Body must be a classroom session with updatedAt.", store: "cloudflare-kv" },
            400
          );
        }
        if (normalizeCode(typeof body.code === "string" ? body.code : "") !== code) {
          return json({ error: "Body code must match query code.", store: "cloudflare-kv" }, 400);
        }
        const prior = await env.CLASSROOMS.get(code, "text");
        let stored = null;
        if (prior !== null) {
          try {
            const before = JSON.parse(prior);
            if (typeof before.updatedAt === "number") stored = before;
          } catch {
          }
        }
        const next = merge(body, stored);
        await env.CLASSROOMS.put(code, JSON.stringify(next), { expirationTtl: TTL_SECONDS });
        return json({
          ok: true,
          updatedAt: next.updatedAt,
          seats: (next.seats ?? []).length,
          store: "cloudflare-kv"
        });
      }
      return json({ error: "Method not allowed", store: "cloudflare-kv" }, 405);
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : "Classroom sync failed",
          store: "cloudflare-kv"
        },
        500
      );
    }
  }
};

// C:/Users/reyse/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// C:/Users/reyse/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ALOHCU/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// C:/Users/reyse/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-ALOHCU/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
