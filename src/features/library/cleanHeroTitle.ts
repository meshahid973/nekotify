/**
 * Display-only title cleanup. Never alter the original tags or library metadata.
 * Only remove known trailing remix descriptors; keep meaningful song words intact.
 */
export function cleanHeroTitle(title: string): string {
  const original = title.trim()
  if (!original) return title
  let cleaned = original
    .replace(/\s*[\[(][^\])]*(?:slowed|reverb|sped[\s-]*up|speed[\s-]*up|extended[\s-]*version)[^\])]*[\])]/gi, '')
    .replace(/\s*(?:[-–—|]\s*)?(?:(?:ultra|super|very|extra)\s+)?slowed(?:\s*(?:\+|&|and)\s*reverb)?(?:\s+(?:version|edit))?\s*$/gi, '')
    .replace(/\s*(?:[-–—|]\s*)?(?:reverb(?:ed)?|sped[\s-]*up|speed[\s-]*up|extended[\s-]*version)(?:\s+(?:version|edit))?\s*$/gi, '')
    .replace(/\s*[-–—|/,:]+\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  // Avoid producing an empty title or a title consisting of metadata only.
  if (cleaned.length === 0) cleaned = original
  return cleaned
}
