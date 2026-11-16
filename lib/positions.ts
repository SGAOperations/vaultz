// Whether a user's stored SGAuth position keys differ from their session's,
// ignoring order and duplicates.
export function positionsChanged(
  stored: readonly string[],
  current: readonly string[],
): boolean {
  const a = new Set(stored);
  const b = new Set(current);
  return a.size !== b.size || [...a].some((key) => !b.has(key));
}
