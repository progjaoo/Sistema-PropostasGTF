export function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const body = payload as Record<string, unknown>;
  if (body.error && typeof body.error === 'object') {
    const message = (body.error as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (typeof body.error === 'string' && body.error.trim()) return body.error;
  if (typeof body.message === 'string' && body.message.trim()) return body.message;
  return fallback;
}
