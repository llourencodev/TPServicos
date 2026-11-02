const DEFAULT_WEB_ORIGIN = "http://localhost:5180";

function normalizedOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Auth endpoints set or consume the refresh-token cookie. Browser POSTs must
 * therefore originate from the configured web application, not another site.
 */
export function isTrustedBrowserOrigin(
  origin: string | undefined,
  configuredOrigin = process.env.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN,
): boolean {
  if (!origin) return false;
  const trusted = normalizedOrigin(configuredOrigin);
  return trusted !== null && normalizedOrigin(origin) === trusted;
}
