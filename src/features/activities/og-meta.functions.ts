/**
 * Server function for OG metadata resolution.
 * Used by the /p/$token loader to set dynamic Open Graph tags.
 * Lightweight — no side effects, no rate limiting.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getActivityMetaByToken } from "./og-meta.server";

export const getOGMeta = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ token: z.string().min(10).max(256) }).parse(data),
  )
  .handler(async ({ data }) => {
    return getActivityMetaByToken(data.token);
  });
