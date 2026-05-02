/**
 * TanStack Start configuration — global request middleware.
 *
 * Adds security headers (CSP, HSTS, X-Frame-Options, etc.) to every response.
 */
import { createStart, createMiddleware } from "@tanstack/react-start";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.stripe.com",
    "frame-src https://js.stripe.com https://checkout.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
};

const securityHeadersMiddleware = createMiddleware().server(
  async ({ next }) => {
    const result = await next();

    // Attach security headers to the response if it's a Response object
    if (result instanceof Response) {
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        result.headers.set(key, value);
      }
    }

    return result;
  },
);

export default createStart({
  requestMiddleware: [securityHeadersMiddleware],
});
