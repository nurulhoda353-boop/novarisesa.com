// Deterministic, contact-distinguishing avatar colors (mirrors the mobile
// app's AvatarPalette) derived from the sender's email address.
const SWATCHES = [
  "#3563E9",
  "#1E9E63",
  "#DB6E2A",
  "#9455D3",
  "#DA3E71",
  "#0F9DB8",
  "#B8860B",
  "#546E7A",
];

export function avatarColorFor(seed: string): string {
  if (!seed) return SWATCHES[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash += seed.charCodeAt(i);
  return SWATCHES[hash % SWATCHES.length];
}
