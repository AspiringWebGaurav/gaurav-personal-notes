/**
 * Gaurav Personal Notes — Version Formatting Utility
 * Guarantees consistent 'vX.Y.Z' or 'X.Y.Z' display across the entire application.
 * Prevents double 'vv' prefixes under all circumstances.
 */

export function cleanVersion(v?: string | null): string {
  if (!v) return '0.0.0';
  return v.trim().replace(/^[vV]+/, '') || '0.0.0';
}

export function formatVersion(v?: string | null): string {
  return `v${cleanVersion(v)}`;
}
