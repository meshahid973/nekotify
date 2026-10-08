/**
 * Display-only title cleanup. Never alter the original tags or library metadata.
 * Only remove known trailing remix descriptors; keep meaningful song words intact.
 */
export function cleanHeroTitle(title: string): string {
  const original = title.trim()
  if (!original) return title
  let cleaned = original
    .replace(/\s*(?:\([^)]*\)|\[[^\n]*?\])/g, (segment) =>
      /\b(slowed|reverb|sped[\s-]*up|speed[\s-]*up|extended[\s-]*version)\b/i.test(segment)
        ? ''
        : segment,
    )
    .replace(/\s*(?:[-–—|]\s*)?(?:(?:ultra|super|very|extra)\s+)?slowed(?:\s*(?:\+|&|and)\s*reverb)?(?:\s+(?:version|edit))?\s*$/gi, '')
    .replace(/\s*(?:[-–—|]\s*)?(?:reverb(?:ed)?|sped[\s-]*up|speed[\s-]*up|extended[\s-]*version)(?:\s+(?:version|edit))?\s*$/gi, '')
    .replace(/\s*[-–—|/,:]+\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  // A filename may contain multiple trailing descriptors (e.g. slowed + reverb
  // followed by extended version). Remove them one at a time.
  for (let i = 0; i < 3; i += 1) {
    const next = cleaned
      .replace(/\s*(?:[-–—|]\s*)?(?:(?:ultra|super|very|extra)\s+)?slowed(?:\s*(?:\+|&|and)\s*reverb)?(?:\s+(?:version|edit))?\s*$/gi, '')
      .replace(/\s*(?:[-–—|]\s*)?(?:reverb(?:ed)?|sped[\s-]*up|speed[\s-]*up|extended[\s-]*version)(?:\s+(?:version|edit))?\s*$/gi, '')
      .replace(/\s*[-–—|/,:]+\s*$/g, '').trim()
    if (!next || next === cleaned) break
    cleaned = next
  }
  // Avoid producing an empty title or a title consisting of metadata only.
  if (cleaned.length === 0) cleaned = original
  return cleaned
}
