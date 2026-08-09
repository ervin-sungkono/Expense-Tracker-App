export function getAppOrigin() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  try {
    const parsed = new URL(appUrl);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getMcpResourceAudience() {
  const origin = getAppOrigin();
  return origin ? new URL('/api/mcp', origin).toString() : null;
}

export function getMcpAllowedOrigins() {
  const origin = getAppOrigin();
  return origin ? [origin] : [];
}
