export function normalizeMainClassCode(value: string | null | undefined): string {
  const v = String(value ?? '').trim();
  if (!v) return '';

  const noParen = v.split('(')[0].trim();
  const noDash = noParen.split(/[-–—]/)[0].trim();
  const token = noDash.split(/\s+/)[0].trim();
  return token.toUpperCase();
}
