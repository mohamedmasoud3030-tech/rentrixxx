export function sanitizeHeaders(headers: Record<string, string | undefined | null>): Record<string, string> {
  const cleaned: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value !== 'string') continue;
    cleaned[key] = value.replace(/[^\x00-\x7F]/g, '');
  }

  return cleaned;
}
