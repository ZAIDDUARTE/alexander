export function invitationTokenFromHash(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    const token = decodeURIComponent(raw);
    return token.length > 0 ? token : null;
  } catch {
    return null;
  }
}
